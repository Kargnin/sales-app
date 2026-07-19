import { useState } from "react";
import { View, TextInput, type KeyboardTypeOptions } from "react-native";
import { cn } from "../../lib/utils";
import { Text } from "../ui/text";

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  required?: boolean;
  /** Max character length. Allows soft truncation without losing typed content. */
  maxLength?: number;
  editable?: boolean;
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  keyboardType,
  required,
  maxLength,
  editable = true,
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {/* Label row */}
      <View className="flex-row items-center gap-0.5">
        <Text variant="label-medium" color="charcoal">
          {label}
        </Text>
        {required && (
          <Text variant="caption" color="ember" className="ml-0.5">
            *
          </Text>
        )}
      </View>

      {/* Input container */}
      <View
        className={cn(
          "bg-surface border rounded-lg px-3",
          multiline ? "min-h-[100px] py-3" : "h-11 justify-center",
          error
            ? "border-ember-orange"
            : isFocused
              ? "border-midnight"
              : "border-stone-border",
        )}
      >
        <TextInput
          className={cn(
            "flex-1 font-body text-[15px] text-charcoal leading-[22.05px] p-0",
            !editable && "opacity-60",
          )}
          placeholder={placeholder}
          placeholderTextColor="#848281"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
        />
      </View>

      {/* Error message */}
      {error ? (
        <View className="flex-row items-center gap-1">
          <Text variant="caption" color="ember" className="flex-1">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
