import { useState, useCallback, useRef, Component } from "react";
import { View, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ZodSchema } from "zod";
import { Text } from "../ui/text";
import { Button } from "../ui/button";
import { WizardStepIndicator } from "./WizardStepIndicator";
import { cn } from "../../lib/utils";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WizardStep {
  key: string;
  title: string;
  /** The step UI. Calls `onDataChange` to feed data back to the wizard. */
  component: React.FC<{
    onDataChange: (data: Record<string, any>) => void;
    /** Per-field validation errors from the last validate + continue attempt. */
    fieldErrors: Record<string, string>;
    /** Previously accumulated data so the step can restore state on remount. */
    initialData: Record<string, any>;
  }>;
  /** Optional Zod schema validated when the user taps "Continue". */
  validationSchema?: ZodSchema;
}

export interface WizardConfig {
  steps: WizardStep[];
  /** Title shown in the wizard header bar. */
  title: string;
  /** Called when the user submits the final step. Receives all accumulated data.
   *  Returns the ID of the created entity. */
  onComplete: (data: Record<string, any>) => Promise<string>;
  /** Called when the user taps the close button. Typically `router.back()`. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WizardProps {
  config: WizardConfig;
}

// ---------------------------------------------------------------------------
// Error boundary (catches rendering crashes inside step components)
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class StepErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[Wizard] Step error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center py-8 px-4">
          <Ionicons name="alert-circle-outline" size={40} color="#848281" />
          <Text variant="body" color="ash" className="text-center mt-3">
            Something went wrong while rendering this step.
          </Text>
          <View className="mt-4">
            <Button variant="secondary" onPress={this.props.onClose}>
              Close Wizard
            </Button>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

/**
 * A generic, reusable multi-step wizard shell.
 *
 * Renders a header with close button, step indicator, the active step's
 * component, and a bottom navigation bar (Back / Continue-or-Submit).
 *
 * Handles:
 *  - Step-by-step navigation with optional per-step Zod validation
 *  - Submission via `onComplete` with loading state
 *  - Error display when submission fails
 *  - Error boundary for step-rendering crashes
 *  - Reduced motion is automatically respected (no step-transition animations)
 */
export function Wizard({ config }: WizardProps) {
  const { steps, title, onComplete, onClose } = config;
  const insets = useSafeAreaInsets();

  // Account for the admin tab bar which is positioned absolutely at the bottom.
  // Tab bar height = insets.bottom + 66 (see admin _layout.tsx)
  const tabBarClearance = insets.bottom + 70;

  // ----- state -----
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dataRef = useRef<Record<string, any>>({});

  // ----- derived -----
  const isLastStep = currentStep === steps.length - 1;
  const currentStepConfig = steps[currentStep];

  // ----- handlers -----
  const handleDataChange = useCallback(
    (newData: Record<string, any>) => {
      dataRef.current = { ...dataRef.current, ...newData };
      setSubmitError(null);
      // Clear field errors when user types
      setFieldErrors({});
    },
    [],
  );

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setSubmitError(null);
    setFieldErrors({});
  }, []);

  const handleNext = useCallback(async () => {
    // 1. Validate current step if a schema is provided
    const schema = currentStepConfig.validationSchema;
    if (schema) {
      const result = schema.safeParse(dataRef.current);
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const issue of result.error.errors) {
          const field = issue.path[0] as string;
          if (!errors[field]) {
            errors[field] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }
    }

    // 2. Submit on the last step, otherwise advance
    if (isLastStep) {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await onComplete(dataRef.current);
        onClose();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStepConfig, isLastStep, onComplete, onClose]);

  // ----- guard (should never happen, but keep TS happy) -----
  if (!currentStepConfig) {
    return null;
  }

  const ActiveStepComponent = currentStepConfig.component;
  const continueLabel = isLastStep ? "Submit" : "Continue";
  const showBackButton = currentStep > 0;

  return (
    <View className="flex-1 bg-canvas" style={{ paddingBottom: tabBarClearance }}>
      {/* ---- Header ---- */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-stone-border bg-surface">
        <TouchableOpacity
          onPress={currentStep > 0 ? handleBack : onClose}
          className="w-8 h-8 rounded-full items-center justify-center bg-surface-recessed"
          accessibilityLabel={currentStep > 0 ? "Go back to previous step" : "Close wizard"}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color="#474645" />
        </TouchableOpacity>
        <Text variant="heading-sm" color="charcoal" numberOfLines={1} className="flex-1 text-center mx-3">
          {title}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          className="w-8 h-8 rounded-full items-center justify-center bg-surface-recessed"
          accessibilityLabel="Close wizard"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color="#474645" />
        </TouchableOpacity>
      </View>

      {/* ---- Step indicator ---- */}
      <WizardStepIndicator steps={steps} currentStep={currentStep} />

      {/* ---- Step content ---- */}
      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* key={currentStep} resets the error boundary when the step changes */}
        <StepErrorBoundary key={currentStep} onClose={onClose}>
          <ActiveStepComponent
            onDataChange={handleDataChange}
            fieldErrors={fieldErrors}
            initialData={dataRef.current}
          />
        </StepErrorBoundary>
      </ScrollView>

      {/* ---- Submission error banner ---- */}
      {submitError && (
        <View className="mx-4 mb-2 p-3 rounded-10 bg-mascot-peach border border-ember-orange/20">
          <Text variant="caption" color="ember" className="text-center">
            {submitError}
          </Text>
        </View>
      )}

      {/* ---- Navigation footer ---- */}
      <View
        className={cn(
          "flex-row gap-3 px-4 py-3 border-t border-stone-border bg-surface",
          !showBackButton && "justify-end",
        )}
      >
        {showBackButton && (
          <View className="flex-1">
            <Button
              variant="secondary"
              onPress={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          </View>
        )}
        <View className={showBackButton ? "flex-1" : "flex-1"}>
          <Button
            variant="primary"
            onPress={handleNext}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {continueLabel}
          </Button>
        </View>
      </View>
    </View>
  );
}
