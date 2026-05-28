import { Pressable, type PressableProps, ActivityIndicator } from "react-native";
import { Text } from "./text";
import { cn } from "../../lib/utils";

interface ButtonProps extends PressableProps {
  variant?: "primary" | "secondary";
  loading?: boolean;
  className?: string;
  children: string;
}

const variantClasses: Record<"primary" | "secondary", string> = {
  primary:   "bg-midnight",
  secondary: "bg-stone-border",
};

export function Button({
  variant = "primary",
  loading,
  children,
  disabled,
  className,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      className={cn(
        "rounded-pill flex-row items-center justify-center gap-2 py-3.5 px-6",
        variantClasses[variant],
        (disabled || loading) && "opacity-70",
        className,
      )}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <ActivityIndicator color={isPrimary ? "#ffffff" : "#474645"} />
      )}
      <Text
        variant="label-medium"
        color={isPrimary ? "surface" : "graphite"}
      >
        {children}
      </Text>
    </Pressable>
  );
}
