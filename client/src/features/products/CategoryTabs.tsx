import { ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "../../components/ui/text";
import { cn } from "../../lib/utils";

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
  className?: string;
}

const DEFAULT_CATEGORIES = ["All", "Drinks", "Snacks", "Dairy", "Pantry"];

export function CategoryTabs({
  categories = DEFAULT_CATEGORIES,
  selectedCategory,
  onSelect,
  className,
}: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn("flex-shrink-0", className)}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {categories.map((category) => {
        const isActive = category === selectedCategory;
        return (
          <TouchableOpacity
            key={category}
            onPress={() => onSelect(category)}
            className={cn(
              "rounded-pill px-4 py-2 border",
              isActive
                ? "bg-midnight border-midnight"
                : "bg-surface border-stone-border",
            )}
            activeOpacity={0.7}
            accessibilityLabel={`Filter by ${category}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              variant="caption"
              color={isActive ? "surface" : "graphite"}
              className="font-body-medium"
            >
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
