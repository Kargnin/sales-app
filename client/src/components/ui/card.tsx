import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/utils";

interface CardProps extends ViewProps {
  recessed?: boolean;
  className?: string;
}

export function Card({ recessed, className, style, children, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "bg-surface rounded-10 border border-stone-border p-5",
        recessed && "bg-surface-recessed",
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}
