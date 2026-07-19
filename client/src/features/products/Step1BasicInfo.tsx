import { useState, useCallback, useMemo } from "react";
import { View } from "react-native";
import { FormInput, SearchablePillSelector } from "../../components/shared";
import { Text } from "../../components/ui/text";
import { useProducts } from "../../hooks/queries/useProducts";

interface Step1BasicInfoProps {
  onDataChange: (data: Record<string, any>) => void;
  fieldErrors: Record<string, string>;
  initialData: Record<string, any>;
}

export function Step1BasicInfo({ onDataChange, fieldErrors, initialData }: Step1BasicInfoProps) {
  const [name, setName] = useState(initialData.name ?? "");
  const [description, setDescription] = useState(initialData.description ?? "");
  const [category, setCategory] = useState(initialData.category ?? "");

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

  const propagate = useCallback(
    (n: string, d: string, c: string) => {
      onDataChange({ name: n, description: d, category: c });
    },
    [onDataChange],
  );

  const handleNameChange = useCallback(
    (text: string) => { setName(text); propagate(text, description, category); },
    [description, category, propagate],
  );

  const handleDescriptionChange = useCallback(
    (text: string) => { setDescription(text); propagate(name, text, category); },
    [name, category, propagate],
  );

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setCategory(cat);
      if (cat && !customCategories.includes(cat)) {
        setCustomCategories((prev) => [...prev, cat]);
      }
      propagate(name, description, cat);
    },
    [name, description, customCategories, propagate],
  );

  return (
    <View className="gap-6 py-4">
      <FormInput
        label="Product Name"
        value={name}
        onChangeText={handleNameChange}
        placeholder="Enter product name"
        error={fieldErrors.name}
        required
      />

      <View className="gap-1.5">
        <FormInput
          label="Product Description"
          value={description}
          onChangeText={handleDescriptionChange}
          placeholder="Describe your product"
          multiline
        />
        <Text variant="caption" color="ash">
          Visible to field agents on their tablets.
        </Text>
      </View>

      <SearchablePillSelector
        label="Category"
        items={allCategories}
        value={category}
        onChange={handleCategoryChange}
        placeholder="Search or type a new category"
      />
    </View>
  );
}
