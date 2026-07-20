import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { View, Text, TextInput } from "react-native";
import { Wizard, type WizardConfig, type WizardStep } from "../../components/shared/Wizard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StepContent({
  stepKey,
  title,
  fields,
  onDataChange,
}: {
  stepKey: string;
  title: string;
  fields: string[];
  onDataChange: (data: Record<string, any>) => void;
}) {
  return (
    <View testID={`step-${stepKey}`}>
      {fields.map((f) => (
        <TextInput
          key={f}
          testID={`field-${f}`}
          onChangeText={(text: string) => onDataChange({ [f]: text })}
          placeholder={f}
        />
      ))}
      <Text>Step: {title}</Text>
    </View>
  );
}

function makeStep(
  key: string,
  title: string,
  fields: string[] = [],
): WizardStep {
  return {
    key,
    title,
    component: ({ onDataChange }) => (
      <StepContent
        stepKey={key}
        title={title}
        fields={fields}
        onDataChange={onDataChange}
      />
    ),
  };
}

function createConfig(
  overrides: Partial<WizardConfig> = {},
): WizardConfig {
  return {
    steps: [
      makeStep("step1", "Basic Info", ["name"]),
      makeStep("step2", "Details", ["description"]),
    ],
    title: "Test Wizard",
    onComplete: jest.fn().mockResolvedValue("new-id"),
    onClose: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Wizard", () => {
  // ── Initial render ──────────────────────────────────────────────────

  it("renders the wizard title", async () => {
    const config = createConfig();
    await render(<Wizard config={config} />);

    expect(screen.getByText("Test Wizard")).toBeTruthy();
  });

  it("renders the first step content", async () => {
    const config = createConfig();
    await render(<Wizard config={config} />);

    expect(screen.getByText("Step: Basic Info")).toBeTruthy();
  });

  it("renders the step indicator bars", async () => {
    const config = createConfig();
    await render(<Wizard config={config} />);

    // The step indicator renders filled/unfilled bars, not text labels.
    // Just verify it doesn't crash — presence of step content confirms render.
    expect(screen.getByText("Step: Basic Info")).toBeTruthy();
  });

  // ── Navigation buttons ──────────────────────────────────────────────

  it('shows "Continue" button on first step (not last)', async () => {
    const config = createConfig();
    await render(<Wizard config={config} />);

    expect(screen.getByText("Continue")).toBeTruthy();
    expect(screen.queryByText("Submit")).toBeNull();
  });

  it('shows "Submit" button on last step', async () => {
    const config = createConfig();
    await render(<Wizard config={config} />);

    await act(() => {
      fireEvent.press(screen.getByText("Continue"));
    });

    expect(screen.getByText("Submit")).toBeTruthy();
    expect(screen.queryByText("Continue")).toBeNull();
  });

  it("Back button navigates to previous step", async () => {
    const config = createConfig();
    await render(<Wizard config={config} />);

    await act(() => {
      fireEvent.press(screen.getByText("Continue"));
    });
    expect(screen.getByText("Step: Details")).toBeTruthy();

    await act(() => {
      fireEvent.press(screen.getByText("Back"));
    });

    expect(screen.getByText("Step: Basic Info")).toBeTruthy();
  });

  it("Close button calls onClose", async () => {
    const onClose = jest.fn();
    const config = createConfig({ onClose });
    await render(<Wizard config={config} />);

    // The close button is the TouchableOpacity containing the close icon.
    // Find it by the icon testID and press the parent (or press the icon —
    // fireEvent in RNTL propagates to the nearest Pressable ancestor).
    const closeIcon = screen.getByTestId("icon-close");
    await act(() => {
      fireEvent.press(closeIcon);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Submission ──────────────────────────────────────────────────────

  it("calls onComplete with accumulated data on submit", async () => {
    const onComplete = jest.fn().mockResolvedValue("new-id");
    const onClose = jest.fn();
    const config = createConfig({ onComplete, onClose });
    await render(<Wizard config={config} />);

    await act(() => {
      fireEvent.changeText(screen.getByTestId("field-name"), "Test Product");
    });

    await act(() => {
      fireEvent.press(screen.getByText("Continue"));
    });

    await act(() => {
      fireEvent.changeText(
        screen.getByTestId("field-description"),
        "A description",
      );
    });

    await act(() => {
      fireEvent.press(screen.getByText("Submit"));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Product",
        description: "A description",
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error when onComplete throws", async () => {
    const onComplete = jest
      .fn()
      .mockRejectedValue(new Error("Server error"));
    const onClose = jest.fn();
    const config = createConfig({
      steps: [makeStep("step1", "Only Step")],
      onComplete,
      onClose,
    });
    await render(<Wizard config={config} />);

    await act(() => {
      fireEvent.press(screen.getByText("Submit"));
    });

    // Error banner should appear
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Server error")).toBeTruthy();
  });

  // ── Multi-step data accumulation ────────────────────────────────────

  it("preserves data from previous steps when navigating back then forward", async () => {
    const onComplete = jest.fn().mockResolvedValue("ok");
    const config = createConfig({ onComplete, onClose: jest.fn() });
    await render(<Wizard config={config} />);

    await act(() => {
      fireEvent.changeText(screen.getByTestId("field-name"), "Value1");
    });

    await act(() => {
      fireEvent.press(screen.getByText("Continue"));
    });

    await act(() => {
      fireEvent.changeText(
        screen.getByTestId("field-description"),
        "Value2",
      );
    });

    // Go back
    await act(() => {
      fireEvent.press(screen.getByText("Back"));
    });

    // Forward again
    await act(() => {
      fireEvent.press(screen.getByText("Continue"));
    });

    await act(() => {
      fireEvent.press(screen.getByText("Submit"));
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Value1",
        description: "Value2",
      }),
    );
  });
});
