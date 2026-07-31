import { useCallback } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/ui/text";

interface ShopViewToggleFABProps {
  viewMode: "grid" | "map";
  onToggle: () => void;
}

export function ShopViewToggleFAB({
  viewMode,
  onToggle,
}: ShopViewToggleFABProps) {
  const insets = useSafeAreaInsets();
  const isGrid = viewMode === "grid";

  const handleToggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={isGrid ? "Switch to Map view" : "Switch to Grid view"}
      className="absolute right-5 flex-row items-center justify-center bg-midnight rounded-full px-5 py-3.5 shadow-xl border border-stone-border/20 z-50 gap-2"
      style={[styles.fabShadow, { bottom: insets.bottom + 80 }]}
    >
      <Ionicons
        name={isGrid ? "map-outline" : "grid-outline"}
        size={22}
        color="#ffffff"
      />
      <Text
        variant="label-medium"
        color="surface"
        className="font-semibold text-sm"
      >
        {isGrid ? "Map View" : "Grid View"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabShadow: {
    shadowColor: "#121212",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
