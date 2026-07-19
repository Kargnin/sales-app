import { useState, useMemo } from "react";
import { View } from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import { FormInputController, SearchablePillSelector } from "../../components/shared";
import { Text } from "../../components/ui/text";
import { useProducts } from "../../hooks/queries/useProducts";

interface Step1BasicInfoProps {
  onDataChange: (data: Record<string, any>) => void;
  fieldErrors: Record<string, string>;
  initialData: Record<string, any>;
}

export function Step1BasicInfo({ onDataChange, fieldErrors, initialData }: Step1BasicInfoProps) {
  const { control } = useFormContext<FieldValues>();

  // ----- Fetch products from React Query cache / API -----
  const { data: products } = useProducts();

  // ----- Derive categories list from cached products dynamically -----
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const allCategories = useMemo(() => {
    const dbCats = products
      ? (products.map((p) => p.category).filter(Boolean) as string[])
      : [];
    return [...new Set([...dbCats, ...customCategories])];
  }, [products, customCategories]);

  return (
    <View className="gap-6 py-4">
      <FormInputController
        name="name"
        control={control}
        label="Product Name"
        placeholder="Enter product name"
        required
      />

      <View className="gap-1.5">
        <FormInputController
          name="description"
          control={control}
          label="Product Description"
          placeholder="Describe your product"
          multiline
        />
        <Text variant="caption" color="ash">
          Visible to field agents on their tablets.
        </Text>
      </View>

      <Controller
        name="category"
        control={control}
        render={({ field: { onChange, value } }) => (
          <SearchablePillSelector
            label="Category"
            items={allCategories}
            value={(value as string) ?? ""}
            onChange={(cat) => {
              onChange(cat);
              if (cat && !customCategories.includes(cat)) {
                setCustomCategories((prev) => [...prev, cat]);
              }
            }}
            placeholder="Search or type a new category"
          />
        )}
      />
    </View>
  );
}
