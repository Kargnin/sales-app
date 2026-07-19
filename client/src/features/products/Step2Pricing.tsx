import { View, TextInput } from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import { FormInputController, FormSelectController, ImageUploader } from "../../components/shared";
import { Text } from "../../components/ui/text";

const UNIT_OPTIONS = [
  { label: "kg", value: "kg" },
  { label: "g", value: "g" },
  { label: "L", value: "L" },
  { label: "pack", value: "pack" },
  { label: "piece", value: "piece" },
];

interface Step2PricingProps {
  onDataChange: (data: Record<string, any>) => void;
  fieldErrors: Record<string, string>;
  initialData: Record<string, any>;
}

export function Step2Pricing({ onDataChange, fieldErrors, initialData }: Step2PricingProps) {
  const { control } = useFormContext<FieldValues>();

  return (
    <View className="gap-6 py-4">
      {/* ---- Product Image ---- */}
      <View className="gap-2">
        <Text variant="label-medium" color="charcoal">
          Product Image
        </Text>
        <Controller
          name="imageUri"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ImageUploader
              imageUri={(value as string) ?? null}
              onImageSelected={onChange}
              onImageRemoved={() => onChange(null)}
            />
          )}
        />
      </View>

      {/* ---- Price (numeric) ---- */}
      <Controller
        name="price"
        control={control}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
          const displayValue = value != null ? String(value) : "";
          return (
            <View className="gap-1.5">
              <View className="flex-row items-center gap-0.5">
                <Text variant="label-medium" color="charcoal">
                  Price
                </Text>
                <Text variant="caption" color="ember" className="ml-0.5">
                  *
                </Text>
              </View>
              <View
                className={`flex-row items-center bg-surface border rounded-lg h-11 px-3 ${
                  error ? "border-ember-orange" : "border-stone-border"
                }`}
              >
                <TextInput
                  className="flex-1 font-body text-[15px] text-charcoal p-0"
                  placeholder="0.00"
                  placeholderTextColor="#848281"
                  value={displayValue}
                  onChangeText={(text) => {
                    // Only allow digits and a single decimal point
                    const filtered = text
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1");
                    const num = parseFloat(filtered);
                    onChange(isNaN(num) ? undefined : num);
                  }}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                />
              </View>
              {error && (
                <Text variant="caption" color="ember">
                  {error.message}
                </Text>
              )}
            </View>
          );
        }}
      />

      {/* ---- Unit ---- */}
      <FormSelectController
        name="unit"
        control={control}
        label="Unit"
        options={UNIT_OPTIONS}
        placeholder="Select unit"
        required
      />

      {/* ---- Tax Rate (numeric) ---- */}
      <View className="gap-1.5">
        <Controller
          name="taxRate"
          control={control}
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
            const displayValue = value != null ? String(value) : "";
            return (
              <View className="gap-1.5">
                <Text variant="label-medium" color="charcoal">
                  Tax Rate
                </Text>
                <View
                  className={`flex-row items-center bg-surface border rounded-lg h-11 px-3 ${
                    error ? "border-ember-orange" : "border-stone-border"
                  }`}
                >
                  <TextInput
                    className="flex-1 font-body text-[15px] text-charcoal p-0"
                    placeholder="0"
                    placeholderTextColor="#848281"
                    value={displayValue}
                    onChangeText={(text) => {
                      const filtered = text
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*)\./g, "$1");
                      const num = parseFloat(filtered);
                      onChange(isNaN(num) ? 0 : num);
                    }}
                    onBlur={onBlur}
                    keyboardType="decimal-pad"
                  />
                </View>
                {error && (
                  <Text variant="caption" color="ember">
                    {error.message}
                  </Text>
                )}
              </View>
            );
          }}
        />
        <Text variant="caption" color="ash">
          Enter a percentage (e.g., 18 for 18%)
        </Text>
      </View>
    </View>
  );
}
