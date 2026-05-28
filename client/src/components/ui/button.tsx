import { Pressable, type PressableProps, ActivityIndicator } from "react-native";
import { Text } from "./text";
import tailwindConfig from "../../../tailwind.config";

interface ButtonProps extends PressableProps {
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: string;
}

const colors = tailwindConfig.theme.extend.colors;

export function Button({ variant = "primary", loading, children, disabled, style, ...props }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: isPrimary ? colors.midnight : colors["stone-border"],
          borderRadius: 9999,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: pressed || disabled ? 0.7 : 1,
        },
        typeof style === "function" ? style({ pressed }) : style,
      ] as any}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator color={isPrimary ? colors.surface : colors.graphite} />}
      <Text variant="label-medium" color={isPrimary ? "surface" : "graphite"}>
        {children}
      </Text>
    </Pressable>
  );
}
