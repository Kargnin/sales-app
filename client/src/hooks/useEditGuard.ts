import { useEffect, useCallback } from "react";
import { Alert } from "react-native";

interface UseEditGuardOptions {
  /** Whether the form has unsaved changes. */
  hasChanges: boolean;
  /** Whether currently in editing mode. If false, no guard is armed. */
  isEditing: boolean;
  /** Called when user chooses "Save" from the prompt. */
  onSave: () => void;
  /** Called when user chooses "Discard" or when there are no changes. */
  onDiscard: () => void;
  /** Navigation object from expo-router's useNavigation(). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

export function useEditGuard({
  hasChanges,
  isEditing,
  onSave,
  onDiscard,
  navigation,
}: UseEditGuardOptions) {
  const promptBeforeDiscard = useCallback(() => {
    if (!hasChanges) {
      onDiscard();
      return;
    }
    Alert.alert(
      "Unsaved Changes",
      "You have unsaved changes. What would you like to do?",
      [
        { text: "Discard", style: "destructive", onPress: onDiscard },
        { text: "Keep Editing", style: "cancel" },
        { text: "Save", onPress: onSave },
      ],
    );
  }, [hasChanges, onSave, onDiscard]);

  useEffect(() => {
    if (!isEditing) return;

    const maybeUnsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (!hasChanges) return;
      e.preventDefault();
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. What would you like to do?",
        [
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
          { text: "Keep Editing", style: "cancel" },
          { text: "Save", onPress: () => onSave() },
        ],
      );
    });

    return () => {
      if (typeof maybeUnsubscribe === "function") maybeUnsubscribe();
      else navigation.removeListener("beforeRemove", () => {});
    };
  }, [isEditing, hasChanges, onSave, navigation]);

  return { promptBeforeDiscard } as const;
}
