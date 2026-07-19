import { useState, useMemo } from "react";
import { View, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../ui/text";

interface SearchablePillSelectorProps {
  /** All available pills. */
  items: string[];
  /** Currently selected value. */
  value: string;
  /** Called when user selects or creates a pill. */
  onChange: (value: string) => void;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Label above the picker. */
  label?: string;
  /** Text for the "create new" button. Use {value} as placeholder. */
  createLabel?: string;
}

export function SearchablePillSelector({
  items,
  value,
  onChange,
  placeholder = "Search or type a new item",
  label,
  createLabel = 'Create "{value}"',
}: SearchablePillSelectorProps) {
  const [search, setSearch] = useState(value);

  // Filter pills by search text
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(q));
  }, [items, search]);

  // Is the current search text a new item not in the list?
  const isNew = search.trim().length > 0 && !items.includes(search.trim());

  return (
    <View className="gap-3">
      {label && (
        <Text variant="heading-sm" color="charcoal">
          {label}
        </Text>
      )}

      {/* Search input */}
      <View className="flex-row items-center bg-surface border border-stone-border rounded-10 px-4 py-3 gap-3">
        <Ionicons name="search-outline" size={18} color="#848281" />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#848281"
          value={search}
          onChangeText={setSearch}
          className="flex-1 font-body text-[15px] text-charcoal"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => { setSearch(""); onChange(""); }}
            accessibilityLabel="Clear selection"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={18} color="#848281" />
          </TouchableOpacity>
        )}
      </View>

      {/* "Create new" hint */}
      {isNew && (
        <TouchableOpacity
          onPress={() => { onChange(search.trim()); setSearch(search.trim()); }}
          className="flex-row items-center gap-2 px-4 py-2.5 bg-mascot-peach/30 rounded-10 border border-ember-orange/20"
        >
          <Ionicons name="add-circle-outline" size={18} color="#ff3e00" />
          <Text variant="body" color="ember">
            {createLabel.replace("{value}", search.trim())}
          </Text>
        </TouchableOpacity>
      )}

      {/* Scrollable pill bar */}
      {filtered.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {filtered.map((item) => {
            const isSelected = value === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => { onChange(item); setSearch(item); }}
                className={`px-4 py-2 rounded-full border ${
                  isSelected
                    ? "bg-midnight border-midnight"
                    : "bg-surface border-stone-border"
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item}`}
              >
                <Text
                  variant="caption"
                  color={isSelected ? "surface" : "graphite"}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
