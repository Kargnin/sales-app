import { View } from "react-native";
import { cn } from "../../lib/utils";

export interface Step {
  key: string;
  title: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

/**
 * Segmented step indicator — each step is a distinct pill, visibly separated.
 * Filled = current or completed step. Empty = upcoming step.
 * The number of segments instantly tells the user how many total steps there are.
 */
export function WizardStepIndicator({
  steps,
  currentStep,
}: WizardStepIndicatorProps) {
  if (steps.length === 0) return null;

  return (
    <View className="px-6 pt-4 pb-2">
      <View className="flex-row gap-1.5">
        {steps.map((step, index) => {
          const isFilled = index <= currentStep;
          return (
            <View
              key={step.key}
              className={cn(
                "flex-1 h-1.5 rounded-full",
                isFilled ? "bg-midnight" : "bg-stone-border",
              )}
            />
          );
        })}
      </View>
    </View>
  );
}
