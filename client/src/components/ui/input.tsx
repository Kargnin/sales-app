import { TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./text";
import tailwindConfig from "../../../tailwind.config";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const colors = tailwindConfig.theme.extend.colors;

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label-medium" color="charcoal">
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: error ? colors["ember-orange"] : colors["stone-border"],
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontFamily: "Inter_400",
            fontSize: 15,
            color: colors.graphite,
          },
          style,
        ]}
        placeholderTextColor={colors.ash}
        {...props}
      />
      {error && (
        <Text variant="caption" color="ember">
          {error}
        </Text>
      )}
    </View>
  );
}
