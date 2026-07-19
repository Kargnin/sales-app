import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui/text";
import { cn } from "../../lib/utils";

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  className?: string;
}

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  min = 0,
  className,
}: QuantityStepperProps) {
  const isAtMin = quantity <= min;

  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <TouchableOpacity
        onPress={onDecrement}
        disabled={isAtMin}
        className={`w-9 h-9 rounded-full items-center justify-center border ${
          isAtMin
            ? "border-stone-border opacity-50"
            : "border-stone-border active:bg-surface-recessed"
        }`}
        accessibilityLabel={`Decrease quantity. Current: ${quantity}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isAtMin }}
      >
        <Ionicons
          name="remove"
          size={18}
          color={isAtMin ? "#848281" : "#343433"}
        />
      </TouchableOpacity>

      <Text
        variant="body"
        color="charcoal"
        className="font-body-semibold min-w-[28px] text-center"
        accessibilityLabel={`Quantity: ${quantity}`}
      >
        {quantity}
      </Text>

      <TouchableOpacity
        onPress={onIncrement}
        className="w-9 h-9 rounded-full bg-midnight items-center justify-center active:opacity-80"
        accessibilityLabel={`Increase quantity. Current: ${quantity}`}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
