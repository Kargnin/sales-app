import { View, type ViewProps } from "react-native";
import tailwindConfig from "../../../tailwind.config";

interface CardProps extends ViewProps {
  recessed?: boolean;
}

const colors = tailwindConfig.theme.extend.colors;

export function Card({ recessed, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: recessed ? colors["surface-recessed"] : colors.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors["stone-border"],
          padding: 20,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
