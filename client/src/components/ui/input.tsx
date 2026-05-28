import { TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./text";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

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
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: error ? "#ff3e00" : "#f2f0ed",
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontFamily: "Inter_400",
            fontSize: 15,
            color: "#474645",
          },
          style,
        ]}
        placeholderTextColor="#848281"
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
