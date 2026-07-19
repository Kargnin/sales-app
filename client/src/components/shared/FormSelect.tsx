import { useState, useCallback, useRef } from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { ReduceMotion, useReducedMotion } from "react-native-reanimated";
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
  /** Called when the field loses focus (for react-hook-form integration). */
  onBlur?: () => void;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  error,
  required,
  onBlur,
}: FormSelectProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<BottomSheetModal>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const hasSelection = value !== "" && options.some((o) => o.value === value);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      sheetRef.current?.dismiss();
      onBlur?.();
    },
    [onChange, onBlur],
  );

  const openSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

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
        onPress={openSheet}
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
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        maxDynamicContentSize={400}
        enablePanDownToClose
        bottomInset={insets.bottom + 16}
        handleIndicatorStyle={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#d1cfce" }}
        backgroundStyle={{ backgroundColor: "#faf9f7", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
          />
        )}
        overrideReduceMotion={
          reducedMotion ? ReduceMotion.Always : ReduceMotion.Never
        }
      >
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
          <BottomSheetFlatList
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
          />
        )}

        {/* Close button */}
        <TouchableOpacity
          onPress={closeSheet}
          className="bg-midnight rounded-full py-3.5 mx-5 mt-4 items-center"
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text variant="label-medium" color="surface">
            Close
          </Text>
        </TouchableOpacity>
      </BottomSheetModal>
    </View>
  );
}
