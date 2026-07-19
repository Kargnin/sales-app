import { useState, useCallback } from "react";
import { View } from "react-native";
import { FormInput, FormSelect, ImageUploader } from "../../components/shared";
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
  const [price, setPrice] = useState(initialData.price != null ? String(initialData.price) : "");
  const [unit, setUnit] = useState(initialData.unit ?? "");
  const [taxRate, setTaxRate] = useState(initialData.taxRate ? String(initialData.taxRate) : "");
  const [imageUri, setImageUri] = useState<string | null>(initialData.imageUri ?? null);

  // ----- Propagate numeric-converted fields to the wizard -----
  const propagate = useCallback(
    (p: string, u: string, tax: string, img: string | null) => {
      const payload: Record<string, any> = {
        price: p ? parseFloat(p) : undefined,
        unit: u,
        taxRate: tax !== "" ? parseFloat(tax) : 0,
      };
      if (img) {
        payload.imageUri = img;
      }
      onDataChange(payload);
    },
    [onDataChange],
  );

  // ----- Handlers -----
  const handlePriceChange = useCallback(
    (text: string) => {
      // Only allow digits and a single decimal point
      const filtered = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      setPrice(filtered);
      propagate(filtered, unit, taxRate, imageUri);
    },
    [unit, taxRate, imageUri, propagate],
  );

  const handleUnitChange = useCallback(
    (val: string) => {
      setUnit(val);
      propagate(price, val, taxRate, imageUri);
    },
    [price, taxRate, imageUri, propagate],
  );

  const handleTaxRateChange = useCallback(
    (text: string) => {
      const filtered = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      setTaxRate(filtered);
      propagate(price, unit, filtered, imageUri);
    },
    [price, unit, imageUri, propagate],
  );

  const handleImageSelected = useCallback(
    (uri: string) => {
      setImageUri(uri);
      propagate(price, unit, taxRate, uri);
    },
    [price, unit, taxRate, propagate],
  );

  const handleImageRemoved = useCallback(() => {
    setImageUri(null);
    propagate(price, unit, taxRate, null);
  }, [price, unit, taxRate, propagate]);

  return (
    <View className="gap-6 py-4">
      {/* ---- Product Image ---- */}
      <View className="gap-2">
        <Text variant="label-medium" color="charcoal">
          Product Image
        </Text>
        <ImageUploader
          imageUri={imageUri}
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
        />
      </View>

      {/* ---- Price ---- */}
      <FormInput
        label="Price"
        value={price}
        onChangeText={handlePriceChange}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={fieldErrors.price}
        required
      />

      {/* ---- Unit ---- */}
      <FormSelect
        label="Unit"
        value={unit}
        onChange={handleUnitChange}
        options={UNIT_OPTIONS}
        placeholder="Select unit"
        error={fieldErrors.unit}
        required
      />

      {/* ---- Tax Rate ---- */}
      <View className="gap-1.5">
        <FormInput
          label="Tax Rate"
          value={taxRate}
          onChangeText={handleTaxRateChange}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Text variant="caption" color="ash">
          Enter a percentage (e.g., 18 for 18%)
        </Text>
      </View>
    </View>
  );
}
