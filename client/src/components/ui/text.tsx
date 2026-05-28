import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "../../lib/utils";

type TextVariant = "display" | "heading" | "heading-sm" | "body" | "label-medium" | "caption";
type TextColor = "graphite" | "charcoal" | "ash" | "midnight" | "ember" | "surface" | "success" | "warning" | "info";

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  className?: string;
}

const variantClasses: Record<TextVariant, string> = {
  display:       "font-display text-[32px] leading-[35.2px] tracking-[-0.8px]",
  heading:       "font-body-semibold text-[23px] leading-[27.6px] tracking-[-0.44px]",
  "heading-sm":  "font-body-semibold text-[19px] leading-[26.22px] tracking-[-0.25px]",
  body:          "font-body text-[15px] leading-[22.05px] tracking-[-0.2px]",
  "label-medium":"font-body-medium text-[15px] leading-[22.05px] tracking-[-0.2px]",
  caption:       "font-body text-[12px] leading-[18.96px] tracking-[-0.14px]",
};

const colorClasses: Record<TextColor, string> = {
  graphite: "text-graphite",
  charcoal: "text-charcoal",
  ash:      "text-ash",
  midnight: "text-midnight",
  ember:    "text-ember-orange",
  surface:  "text-surface",
  success:  "text-success",
  warning:  "text-warning",
  info:     "text-info",
};

export function Text({
  variant = "body",
  color = "graphite",
  className,
  style,
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      className={cn(variantClasses[variant], colorClasses[color], className)}
      style={style}
      selectable
      {...props}
    >
      {children}
    </RNText>
  );
}
