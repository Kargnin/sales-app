import { useState, useMemo, useRef, useCallback } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { ReduceMotion, useReducedMotion } from "react-native-reanimated";
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
    <Text
      variant="label-medium"
      color="charcoal"
      className="mb-2 font-semibold"
    >
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
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>(
    defaultFilterKey ?? (filterOptions ? "__all" : ""),
  );
  const [activeSort, setActiveSort] = useState<string>(
    defaultSortKey ?? sortOptions?.[0]?.key ?? "",
  );

  const snapPoints = useMemo(() => ["50%"], []);

  const defaultSort = defaultSortKey ?? sortOptions?.[0]?.key ?? "";
  const hasActiveFilter = activeFilter !== "__all" && activeFilter !== "";
  const hasNonDefaultSort = activeSort !== defaultSort && activeSort !== "";
  const hasOptions =
    (filterOptions && filterOptions.length > 0) ||
    (sortOptions && sortOptions.length > 1);
  const filterBadge = hasActiveFilter || hasNonDefaultSort;

  // Toggle or deselect filter option (tapping an active filter shifts it back to "__all")
  const handleFilterPress = useCallback((key: string) => {
    setActiveFilter((prev) => (prev === key ? "__all" : key));
  }, []);

  // Toggle or deselect sort option (tapping an active sort option deselects it)
  const handleSortPress = useCallback(
    (key: string) => {
      setActiveSort((prev) => (prev === key ? defaultSort : key));
    },
    [defaultSort],
  );

  const result = useMemo(() => {
    let filtered = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((item) =>
        searchKeys.some((key) => {
          const val = item[key];
          return typeof val === "string" && val.toLowerCase().includes(q);
        }),
      );
    }

    if (filterOptions && activeFilter !== "__all" && activeFilter !== "") {
      const filterFn = filterOptions.find((f) => f.key === activeFilter);
      if (filterFn) filtered = filtered.filter(filterFn.predicate);
    }

    if (activeSort) {
      const sortFn = sortOptions?.find((s) => s.key === activeSort);
      if (sortFn) {
        filtered = [...filtered].sort(sortFn.compare);
      }
    }

    return filtered;
  }, [
    data,
    search,
    activeFilter,
    activeSort,
    searchKeys,
    filterOptions,
    sortOptions,
  ]);

  const allFilterPills = filterOptions
    ? [
        { key: "__all", label: "All" },
        ...filterOptions.map(({ key, label }) => ({ key, label })),
      ]
    : [];

  const openSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  return (
    <>
      {/* Search Bar */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row items-center bg-surface border border-stone-border rounded-10 px-4 py-3 gap-3 shadow-sm">
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
              onPress={openSheet}
              testID="filter-funnel-button"
              className="relative p-1"
              accessibilityLabel="Filter and sort options"
              accessibilityRole="button"
            >
              <Ionicons
                name="funnel-outline"
                size={20}
                color={filterBadge ? "#ff3e00" : "#848281"}
              />
              {filterBadge && (
                <View
                  testID="filter-badge-dot"
                  className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-ember-orange border border-surface"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter / Sort Bottom Sheet Modal */}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        bottomInset={insets.bottom + 16}
        handleIndicatorStyle={{
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#d1cfce",
        }}
        backgroundStyle={{
          backgroundColor: "#faf9f7",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
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
        <BottomSheetView className="px-5 pb-6">
          {/* Filter Section */}
          {allFilterPills.length > 1 && (
            <View className="mb-5">
              <SectionLabel>Filter by Status</SectionLabel>
              <View className="flex-row flex-wrap gap-2">
                {allFilterPills.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => handleFilterPress(opt.key)}
                    className={`px-4 py-2 rounded-full border ${
                      activeFilter === opt.key
                        ? "bg-midnight border-midnight shadow-sm"
                        : "bg-surface border-stone-border"
                    }`}
                    accessibilityLabel={`Filter ${opt.label}`}
                    accessibilityRole="button"
                  >
                    <Text
                      variant="caption"
                      color={activeFilter === opt.key ? "surface" : "ash"}
                      className="font-medium"
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
            <View className="mb-6">
              <SectionLabel>Sort by</SectionLabel>
              <View className="flex-row flex-wrap gap-2">
                {sortOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => handleSortPress(opt.key)}
                    className={`px-4 py-2 rounded-full border ${
                      activeSort === opt.key
                        ? "bg-midnight border-midnight shadow-sm"
                        : "bg-surface border-stone-border"
                    }`}
                    accessibilityLabel={`Sort by ${opt.label}`}
                    accessibilityRole="button"
                  >
                    <Text
                      variant="caption"
                      color={activeSort === opt.key ? "surface" : "ash"}
                      className="font-medium"
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Apply / Done */}
          <TouchableOpacity
            onPress={closeSheet}
            className="bg-midnight rounded-full py-3.5 items-center shadow-md"
            accessibilityLabel="Apply filters"
            accessibilityRole="button"
          >
            <Text
              variant="label-medium"
              color="surface"
              className="font-semibold"
            >
              Done
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      {children(result)}
    </>
  );
}
