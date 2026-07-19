import { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../lib/utils";
import { Text } from "../ui/text";

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  error,
  required,
}: FormSelectProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const hasSelection = value !== "" && options.some((o) => o.value === value);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setIsOpen(false);
    },
    [onChange],
  );

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

      {/* Select trigger */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
        className={cn(
          "h-11 flex-row items-center bg-surface border rounded-lg px-3",
          error ? "border-ember-orange" : "border-stone-border",
        )}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Text
          variant="body"
          color={hasSelection ? "charcoal" : "ash"}
          className="flex-1"
          numberOfLines={1}
        >
          {hasSelection ? selectedLabel : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#848281" />
      </TouchableOpacity>

      {/* Error message */}
      {error ? (
        <Text variant="caption" color="ember">{error}</Text>
      ) : null}

      {/* Options bottom sheet */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-midnight/40"
          onPress={() => setIsOpen(false)}
        >
          <View />
        </Pressable>
        <View
          className="bg-canvas rounded-t-2xl"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Handle bar */}
          <View className="items-center pt-3 pb-4">
            <View className="w-10 h-1 rounded-full bg-stone-border" />
          </View>

          {/* Sheet label */}
          <Text
            variant="heading-sm"
            color="charcoal"
            className="px-5 mb-4"
          >
            {label}
          </Text>

          {/* Options list */}
          {options.length === 0 ? (
            <View className="px-5 py-8 items-center">
              <Text variant="body" color="ash">
                No options available
              </Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.value)}
                    className={cn(
                      "flex-row items-center px-5 py-3.5 mx-3 rounded-lg",
                      isSelected && "bg-midnight",
                    )}
                    accessibilityLabel={item.label}
                    accessibilityRole="button"
                  >
                    <Text
                      variant="body"
                      color={isSelected ? "surface" : "graphite"}
                      className="flex-1"
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#ffffff"
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              className="max-h-80"
            />
          )}

          {/* Close button */}
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            className="bg-midnight rounded-full py-3.5 mx-5 mt-4 items-center"
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text variant="label-medium" color="surface">
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
