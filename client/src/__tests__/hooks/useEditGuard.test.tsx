import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Text, TouchableOpacity, View } from "react-native";
import {
  useEditGuard,
  type EditGuardNavigation,
} from "../../hooks/useEditGuard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockNavigation(
  overrides: Partial<EditGuardNavigation> = {},
): EditGuardNavigation {
  return {
    addListener: jest.fn().mockReturnValue(jest.fn()),
    setOptions: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    ...overrides,
  };
}

interface TestHarnessProps {
  isEditing: boolean;
  hasChanges: boolean;
  onSave: () => Promise<boolean>;
  onDiscard: () => void;
  navigation: EditGuardNavigation;
}

function TestHarness({
  isEditing,
  hasChanges,
  onSave,
  onDiscard,
  navigation,
}: TestHarnessProps) {
  const { ConfirmationModal, handleBackPress } = useEditGuard({
    isEditing,
    hasChanges,
    onSave,
    onDiscard,
    navigation,
  });

  return (
    <View testID="harness-root">
      <TouchableOpacity testID="back-button" onPress={handleBackPress}>
        <Text>Back</Text>
      </TouchableOpacity>
      {ConfirmationModal}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useEditGuard", () => {
  // ── Not editing: normal navigation ──────────────────────────────────

  it("navigates back when NOT editing and canGoBack is true", async () => {
    const navigation = createMockNavigation();
    await render(
      <TestHarness
        isEditing={false}
        hasChanges={false}
        onSave={jest.fn()}
        onDiscard={jest.fn()}
        navigation={navigation}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });

    expect(navigation.canGoBack).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("does NOT navigate back when NOT editing and canGoBack is false", async () => {
    const navigation = createMockNavigation({
      canGoBack: jest.fn().mockReturnValue(false),
    });
    await render(
      <TestHarness
        isEditing={false}
        hasChanges={false}
        onSave={jest.fn()}
        onDiscard={jest.fn()}
        navigation={navigation}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });

    expect(navigation.canGoBack).toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  // ── Editing, no changes: silent discard ─────────────────────────────

  it("calls onDiscard when editing with NO unsaved changes", async () => {
    const onDiscard = jest.fn();
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={false}
        onSave={jest.fn()}
        onDiscard={onDiscard}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  // ── Editing, has changes: modal appears ─────────────────────────────

  it("shows confirmation modal when editing WITH unsaved changes", async () => {
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={jest.fn().mockResolvedValue(true)}
        onDiscard={jest.fn()}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });

    // Modal content should be visible
    expect(screen.getByText("Unsaved Changes")).toBeTruthy();
    expect(
      screen.getByText("You have unsaved changes. What would you like to do?"),
    ).toBeTruthy();
  });

  it("does NOT call onDiscard immediately when modal is shown", async () => {
    const onDiscard = jest.fn();
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={jest.fn().mockResolvedValue(true)}
        onDiscard={onDiscard}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });

    expect(onDiscard).not.toHaveBeenCalled();
  });

  // ── Modal: Save button ──────────────────────────────────────────────

  it("'Save Changes' calls onSave, and on success calls onDiscard", async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const onDiscard = jest.fn();
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={onSave}
        onDiscard={onDiscard}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });
    await act(() => {
      fireEvent.press(screen.getByText("Save Changes"));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("'Save Changes' keeps modal open when onSave returns false", async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const onDiscard = jest.fn();
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={onSave}
        onDiscard={onDiscard}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });
    await act(() => {
      fireEvent.press(screen.getByText("Save Changes"));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    // Modal should still be visible
    expect(screen.getByText("Unsaved Changes")).toBeTruthy();
  });

  // ── Modal: Discard button ───────────────────────────────────────────

  it("'Discard Changes' calls onDiscard and dismisses modal", async () => {
    const onDiscard = jest.fn();
    const onSave = jest.fn();
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={onSave}
        onDiscard={onDiscard}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });
    await act(() => {
      fireEvent.press(screen.getByText("Discard Changes"));
    });

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  // ── Modal: Keep Editing button ──────────────────────────────────────

  it("'Keep Editing' dismisses modal without calling onSave or onDiscard", async () => {
    const onDiscard = jest.fn();
    const onSave = jest.fn();
    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={onSave}
        onDiscard={onDiscard}
        navigation={createMockNavigation()}
      />,
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("back-button"));
    });
    await act(() => {
      fireEvent.press(screen.getByText("Keep Editing"));
    });

    expect(onDiscard).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByText("Unsaved Changes")).toBeNull();
  });

  // ── beforeRemove listener (hardware back) ───────────────────────────

  it("beforeRemove with no changes calls onDiscard", async () => {
    const onDiscard = jest.fn();
    const navigation = createMockNavigation();
    let capturedCallback: ((e: any) => void) | null = null;
    navigation.addListener = jest.fn().mockImplementation((_event, cb) => {
      capturedCallback = cb;
      return jest.fn();
    });

    await render(
      <TestHarness
        isEditing={true}
        hasChanges={false}
        onSave={jest.fn()}
        onDiscard={onDiscard}
        navigation={navigation}
      />,
    );

    const event = {
      preventDefault: jest.fn(),
      data: { action: { type: "GO_BACK" } },
    };
    await act(() => {
      capturedCallback!(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("beforeRemove with changes shows modal and dispatches on discard", async () => {
    const onDiscard = jest.fn();
    const navigation = createMockNavigation();
    let capturedCallback: ((e: any) => void) | null = null;
    navigation.addListener = jest.fn().mockImplementation((_event, cb) => {
      capturedCallback = cb;
      return jest.fn();
    });

    await render(
      <TestHarness
        isEditing={true}
        hasChanges={true}
        onSave={jest.fn().mockResolvedValue(true)}
        onDiscard={onDiscard}
        navigation={navigation}
      />,
    );

    const action = { type: "GO_BACK", payload: { key: "test" } };
    const event = {
      preventDefault: jest.fn(),
      data: { action },
    };
    await act(() => {
      capturedCallback!(event);
    });

    expect(screen.getByText("Unsaved Changes")).toBeTruthy();

    await act(() => {
      fireEvent.press(screen.getByText("Discard Changes"));
    });

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledWith(action);
  });

  it("unsubscribes from beforeRemove when editing stops", async () => {
    const navigation = createMockNavigation();
    const unsubscribe = jest.fn();
    navigation.addListener = jest.fn().mockReturnValue(unsubscribe);

    const { rerender } = await render(
      <TestHarness
        isEditing={true}
        hasChanges={false}
        onSave={jest.fn()}
        onDiscard={jest.fn()}
        navigation={navigation}
      />,
    );

    expect(navigation.addListener).toHaveBeenCalled();

    await act(async () => {
      await rerender(
        <TestHarness
          isEditing={false}
          hasChanges={false}
          onSave={jest.fn()}
          onDiscard={jest.fn()}
          navigation={navigation}
        />,
      );
    });

    expect(unsubscribe).toHaveBeenCalled();
  });
});
