import { useState, useCallback, useRef } from "react";
import { View, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../../lib/utils";
import { Text } from "../ui/text";

interface CategoryChipsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  onAddNew: (category: string) => void;
}

export function CategoryChips({
  categories,
  selected,
  onSelect,
  onAddNew,
}: CategoryChipsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleAddNew = useCallback(() => {
    const trimmed = newCategory.trim();
    if (trimmed) {
      onAddNew(trimmed);
    }
    setNewCategory("");
    setIsAdding(false);
  }, [newCategory, onAddNew]);

  const handleCancelNew = useCallback(() => {
    setNewCategory("");
    setIsAdding(false);
  }, []);

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
    // Focus the input after the state update renders it
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const shortlist = categories.slice(-5);

  return (
    <View className="gap-2">
      {/* Chips row */}
      <View className="flex-row flex-wrap gap-2">
        {shortlist.map((category) => {
          const isSelected = category === selected;
          return (
            <TouchableOpacity
              key={category}
              onPress={() => onSelect(category)}
              className={cn(
                "px-4 py-2 rounded-full border",
                isSelected
                  ? "bg-midnight border-midnight"
                  : "bg-surface border-stone-border",
              )}
              accessibilityLabel={`Category: ${category}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                variant="caption"
                color={isSelected ? "surface" : "graphite"}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* "+ New" chip or inline input */}
        {isAdding ? null : (
          <TouchableOpacity
            onPress={handleStartAdding}
            className="px-4 py-2 rounded-full border border-dashed border-stone-border bg-surface flex-row items-center gap-1"
            accessibilityLabel="Add new category"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={14} color="#474645" />
            <Text variant="caption" color="graphite">
              New
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inline add-new input */}
      {isAdding && (
        <View className="flex-row items-center bg-surface border border-stone-border rounded-lg px-3 h-11 gap-2">
          <TextInput
            ref={inputRef}
            className="flex-1 font-body text-[15px] text-charcoal p-0"
            placeholder="Enter category name"
            placeholderTextColor="#848281"
            value={newCategory}
            onChangeText={setNewCategory}
            onSubmitEditing={handleAddNew}
            autoFocus
            returnKeyType="done"
          />
          {/* Confirm button */}
          <TouchableOpacity
            onPress={handleAddNew}
            disabled={!newCategory.trim()}
            className="w-7 h-7 rounded-full bg-midnight items-center justify-center"
            accessibilityLabel="Confirm new category"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          </TouchableOpacity>
          {/* Cancel button */}
          <TouchableOpacity
            onPress={handleCancelNew}
            className="w-7 h-7 rounded-full bg-stone-border items-center justify-center"
            accessibilityLabel="Cancel new category"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={14} color="#474645" />
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {categories.length === 0 && !isAdding && (
        <Text variant="caption" color="ash" className="pt-1">
          No categories yet. Tap "+ New" to create one.
        </Text>
      )}
    </View>
  );
}
