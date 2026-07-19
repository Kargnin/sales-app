import { useEffect, useCallback, useState, useRef } from "react";
import { View, TouchableOpacity, Modal } from "react-native";
import { Text } from "../components/ui/text";
import { Button } from "../components/ui/button";

/** The event shape emitted by React Navigation's `beforeRemove` listener. */
interface BeforeRemoveEvent {
  preventDefault: () => void;
  data: {
    action: Readonly<{
      type: string;
      payload?: object;
      source?: string;
      target?: string;
    }>;
  };
}

/** Navigation type compatible with expo-router's useNavigation(). */
interface EditGuardNavigation {
  addListener: (
    event: "beforeRemove",
    callback: (e: BeforeRemoveEvent) => void,
  ) => () => void;
  setOptions: (options: Record<string, unknown>) => void;
  canGoBack: () => boolean;
  goBack: () => void;
  dispatch: (action: Readonly<{ type: string; payload?: object }>) => void;
}

interface UseEditGuardOptions {
  /** Whether currently in editing mode. If false, no guard is armed. */
  isEditing: boolean;
  /** Whether the form has unsaved changes. */
  hasChanges: boolean;
  /**
   * Called when the user chooses "Save" from the confirmation modal.
   * Must return `true` when the save succeeded and `false` when it failed
   * (e.g. validation errors).
   */
  onSave: () => Promise<boolean>;
  /**
   * Called to exit editing mode — sets `isEditing = false`, clears errors,
   * and any other page-level teardown after a discard or successful save.
   */
  onDiscard: () => void;
  /** Navigation object from expo-router's `useNavigation()`. */
  navigation: EditGuardNavigation;
}

export function useEditGuard({
  isEditing,
  hasChanges,
  onSave,
  onDiscard,
  navigation,
}: UseEditGuardOptions) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Ref-based storage for the action to run after the user resolves the
   * confirmation modal. Using a ref avoids stale closures inside the modal
   * handlers and works across both header-back and beforeRemove flows.
   */
  const pendingActionRef = useRef<(() => void) | null>(null);

  // ── Modal button handlers ──────────────────────────────────────────

  const handleModalSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await onSave();
      if (!success) return; // validation failed — keep modal open
      setShowConfirmModal(false);
      pendingActionRef.current?.();
      pendingActionRef.current = null;
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const handleModalDiscard = useCallback(() => {
    setShowConfirmModal(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const handleModalKeepEditing = useCallback(() => {
    setShowConfirmModal(false);
    pendingActionRef.current = null;
  }, []);

  // ── Show the confirmation modal and enqueue a follow-up action ─────

  const promptUnsavedChanges = useCallback(
    (afterResolve?: () => void) => {
      pendingActionRef.current = afterResolve ?? null;
      setShowConfirmModal(true);
    },
    [],
  );

  // ── beforeRemove listener (hardware back / browser back) ───────────

  useEffect(() => {
    if (!isEditing) return;

    const unsubscribe = navigation.addListener(
      "beforeRemove",
      (e: BeforeRemoveEvent) => {
        // Always prevent navigation while in edit mode.
        // The first back-press exits editing; a second back-press navigates.
        e.preventDefault();

        if (!hasChanges) {
          onDiscard();
          return;
        }

        promptUnsavedChanges(() => {
          // Exit edit mode *and* dispatch the pending navigation action
          // that was blocked. This is the actionToDispatch pattern from
          // docs/onboarding-gotchas.md §9.4.
          onDiscard();
          navigation.dispatch(e.data.action);
        });
      },
    );

    return unsubscribe;
  }, [isEditing, hasChanges, onDiscard, navigation, promptUnsavedChanges]);

  // ── Back-button handler for `headerLeft` override ─────────────────

  /**
   * Call this from a custom `headerLeft` `TouchableOpacity.onPress`.
   * When editing it exits edit mode (prompting if dirty); when not
   * editing it performs a normal `navigation.goBack()`.
   */
  const handleBackPress = useCallback(() => {
    if (!isEditing) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }

    if (!hasChanges) {
      onDiscard();
      return;
    }

    promptUnsavedChanges(onDiscard);
  }, [isEditing, hasChanges, onDiscard, navigation, promptUnsavedChanges]);

  // ── Confirmation Modal (coherent with app design system) ──────────

  const ConfirmationModal = (
    <Modal
      visible={showConfirmModal}
      transparent
      animationType="fade"
      onRequestClose={handleModalKeepEditing}
    >
      <View className="flex-1 bg-midnight/40 items-center justify-center px-4">
        <View className="bg-canvas border border-stone-border rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl">
          <Text
            variant="heading-sm"
            color="charcoal"
            className="text-center mt-1"
          >
            Unsaved Changes
          </Text>
          <Text
            variant="body"
            color="graphite"
            className="text-center leading-5 mb-2"
          >
            You have unsaved changes. What would you like to do?
          </Text>

          <View className="gap-3">
            <Button
              variant="primary"
              onPress={handleModalSave}
              loading={isSaving}
            >
              Save Changes
            </Button>
            <Button
              variant="secondary"
              className="bg-stone-border/40 active:bg-stone-border/60"
              onPress={handleModalDiscard}
            >
              Discard Changes
            </Button>
            <TouchableOpacity
              onPress={handleModalKeepEditing}
              className="items-center py-2 mt-1"
              accessibilityLabel="Keep editing"
              accessibilityRole="button"
            >
              <Text variant="label-medium" color="ash">
                Keep Editing
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { ConfirmationModal, handleBackPress } as const;
}
