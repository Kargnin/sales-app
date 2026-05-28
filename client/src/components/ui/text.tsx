import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import tailwindConfig from "../../../tailwind.config";

type TextVariant = "display" | "heading" | "heading-sm" | "body" | "label-medium" | "caption";

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: "graphite" | "charcoal" | "ash" | "midnight" | "ember" | "surface" | "success" | "warning" | "info";
}

const variantStyles: Record<TextVariant, { fontFamily: string; fontSize: number; letterSpacing: number; lineHeight: number }> = {
  display:       { fontFamily: "Fraunces_500", fontSize: 32, letterSpacing: -0.8, lineHeight: 35.2 },
  heading:       { fontFamily: "Inter_600",    fontSize: 23, letterSpacing: -0.44, lineHeight: 27.6 },
  "heading-sm":  { fontFamily: "Inter_600",    fontSize: 19, letterSpacing: -0.25, lineHeight: 26.22 },
  body:          { fontFamily: "Inter_400",    fontSize: 15, letterSpacing: -0.2,  lineHeight: 22.05 },
  "label-medium":{ fontFamily: "Inter_500",    fontSize: 15, letterSpacing: -0.2,  lineHeight: 22.05 },
  caption:       { fontFamily: "Inter_400",    fontSize: 12, letterSpacing: -0.14, lineHeight: 18.96 },
};

const colors = tailwindConfig.theme.extend.colors;

const colorMap: Record<NonNullable<TextProps["color"]>, string> = {
  graphite: colors.graphite,
  charcoal: colors.charcoal,
  ash: colors.ash,
  midnight: colors.midnight,
  ember: colors["ember-orange"],
  surface: colors.surface,
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
};

export function Text({ variant = "body", color = "graphite", style, children, ...props }: TextProps) {
  const v = variantStyles[variant];
  return (
    <RNText
      style={[
        {
          fontFamily: v.fontFamily,
          fontSize: v.fontSize,
          letterSpacing: v.letterSpacing,
          lineHeight: v.lineHeight,
          color: colorMap[color],
        },
        style,
      ]}
      selectable
      {...props}
    >
      {children}
    </RNText>
  );
}
