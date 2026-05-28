import { Pressable, type PressableProps, ActivityIndicator } from "react-native";
import { Text } from "./text";

interface ButtonProps extends PressableProps {
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: string;
}

export function Button({ variant = "primary", loading, children, disabled, style, ...props }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: isPrimary ? "#121212" : "#f2f0ed",
          borderRadius: 9999,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: pressed || disabled ? 0.7 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator color={isPrimary ? "#ffffff" : "#474645"} />}
      <Text variant="label-medium" color={isPrimary ? "surface" : "graphite"}>
        {children}
      </Text>
    </Pressable>
  );
}
