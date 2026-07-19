import { useState, useMemo } from "react";
import { View, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../ui/text";

export interface FilterOption<T> {
  key: string;
  label: string;
  predicate: (item: T) => boolean;
}

export interface SortOption<T> {
  key: string;
  label: string;
  compare: (a: T, b: T) => number;
}

interface FilterToolbarProps<T> {
  data: T[];
  searchPlaceholder?: string;
  /** Keys to search within for text matching. Primitive string values only. */
  searchKeys: (keyof T)[];
  /** Optional: filter options shown in the bottom sheet. */
  filterOptions?: FilterOption<T>[];
  /** Optional: sort options shown in the bottom sheet. */
  sortOptions?: SortOption<T>[];
  defaultFilterKey?: string;
  defaultSortKey?: string;
  children: (filteredSorted: T[]) => React.ReactNode;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="label-medium" color="charcoal" className="mb-2">
      {children}
    </Text>
  );
}

export function FilterToolbar<T extends Record<string, any>>({
  data,
  searchPlaceholder = "Search...",
  searchKeys,
  filterOptions,
  sortOptions,
  defaultFilterKey,
  defaultSortKey,
  children,
}: FilterToolbarProps<T>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>(
    defaultFilterKey ?? (filterOptions ? "__all" : "")
  );
  const [activeSort, setActiveSort] = useState<string>(
    defaultSortKey ?? sortOptions?.[0]?.key ?? ""
  );

  const hasActiveFilter = activeFilter !== "__all";
  const hasNonDefaultSort = activeSort !== (defaultSortKey ?? sortOptions?.[0]?.key);
  const hasOptions = (filterOptions && filterOptions.length > 0) || (sortOptions && sortOptions.length > 1);
  const filterBadge = hasActiveFilter || hasNonDefaultSort;

  const result = useMemo(() => {
    let filtered = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((item) =>
        searchKeys.some((key) => {
          const val = item[key];
          return typeof val === "string" && val.toLowerCase().includes(q);
        })
      );
    }

    if (filterOptions && activeFilter !== "__all") {
      const filterFn = filterOptions.find((f) => f.key === activeFilter);
      if (filterFn) filtered = filtered.filter(filterFn.predicate);
    }

    const sortFn = sortOptions?.find((s) => s.key === activeSort);
    if (sortFn) {
      filtered = [...filtered].sort(sortFn.compare);
    }

    return filtered;
  }, [data, search, activeFilter, activeSort, searchKeys, filterOptions, sortOptions]);

  const allFilterPills = filterOptions
    ? [{ key: "__all", label: "All" }, ...filterOptions.map(({ key, label }) => ({ key, label }))]
    : [];

  return (
    <>
      {/* Search Bar */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row items-center bg-surface border border-stone-border rounded-10 px-4 py-3 gap-3">
          <Ionicons name="search-outline" size={18} color="#848281" />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor="#848281"
            value={search}
            onChangeText={setSearch}
            className="flex-1 font-body text-[15px] text-charcoal"
            accessibilityLabel={searchPlaceholder}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={18} color="#848281" />
            </TouchableOpacity>
          )}
          {hasOptions && (
            <TouchableOpacity
              onPress={() => setSheetVisible(true)}
              className="relative"
              accessibilityLabel="Filter and sort options"
              accessibilityRole="button"
            >
              <Ionicons
                name="funnel-outline"
                size={18}
                color={filterBadge ? "#ff3e00" : "#848281"}
              />
              {filterBadge && (
                <View className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-ember-orange" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter / Sort Bottom Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable
          className="flex-1 bg-midnight/40"
          onPress={() => setSheetVisible(false)}
        >
          <View />
        </Pressable>
        <View className="bg-canvas rounded-t-2xl px-5" style={{ paddingBottom: insets.bottom + 16 }}>
          {/* Handle */}
          <View className="items-center pt-3 pb-4">
            <View className="w-10 h-1 rounded-full bg-stone-border" />
          </View>

          {/* Filter Section */}
          {allFilterPills.length > 1 && (
            <View className="mb-5">
              <SectionLabel>Filter by</SectionLabel>
              <View className="flex-row flex-wrap gap-2">
                {allFilterPills.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setActiveFilter(opt.key)}
                    className={`px-4 py-2 rounded-full border ${
                      activeFilter === opt.key
                        ? "bg-midnight border-midnight"
                        : "bg-surface border-stone-border"
                    }`}
                    accessibilityLabel={`Filter ${opt.label}`}
                    accessibilityRole="button"
                  >
                    <Text
                      variant="caption"
                      color={activeFilter === opt.key ? "surface" : "ash"}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sort Section */}
          {sortOptions && sortOptions.length > 1 && (
            <View className="mb-5">
              <SectionLabel>Sort by</SectionLabel>
              <View className="flex-row flex-wrap gap-2">
                {sortOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setActiveSort(opt.key)}
                    className={`px-4 py-2 rounded-full border ${
                      activeSort === opt.key
                        ? "bg-midnight border-midnight"
                        : "bg-surface border-stone-border"
                    }`}
                    accessibilityLabel={`Sort by ${opt.label}`}
                    accessibilityRole="button"
                  >
                    <Text
                      variant="caption"
                      color={activeSort === opt.key ? "surface" : "ash"}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Done */}
          <TouchableOpacity
            onPress={() => setSheetVisible(false)}
            className="bg-midnight rounded-full py-3.5 items-center"
            accessibilityLabel="Apply filters"
            accessibilityRole="button"
          >
            <Text variant="label-medium" color="surface">
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {children(result)}
    </>
  );
}
