import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { View, TextInput, type TextInputProps, type KeyboardTypeOptions } from "react-native";
import type { ReactNode } from "react";
import { Text } from "../ui/text";

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  rightIcon?: ReactNode;
}

export function FormField<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  autoCorrect,
  rightIcon,
}: FormFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className="gap-1.5">
          <Text variant="label-medium" color="charcoal">
            {label}
          </Text>
          <View
            className={`flex-row items-center bg-surface border rounded-10 h-14 px-4 ${
              error ? "border-ember-orange" : "border-stone-border"
            }`}
          >
            <TextInput
              className="flex-1 font-body text-[15px] text-charcoal h-full"
              placeholder={placeholder}
              placeholderTextColor="#848281"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
            />
            {rightIcon}
          </View>
          {error && (
            <Text variant="caption" color="ember">
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}
