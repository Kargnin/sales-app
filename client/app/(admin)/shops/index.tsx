import { useState, useCallback } from "react";
import { View, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { Card } from "../../../src/components/ui/card";
import { useShops } from "../../../src/hooks/queries/useShops";
import {
  ShopGridView,
  ShopMapView,
  ShopViewToggleFAB,
} from "../../../src/features/shops";
import {
  FilterToolbar,
  type SortOption,
  type FilterOption,
} from "../../../src/components/shared/FilterToolbar";
import { useAuthStore } from "../../../src/stores/authStore";
import { apiClient } from "../../../src/lib/apiClient";
import type { Shop } from "../../../src/types";

const sortOptions: SortOption<Shop>[] = [
  {
    key: "name_asc",
    label: "Name (A-Z)",
    compare: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: "name_desc",
    label: "Name (Z-A)",
    compare: (a, b) => b.name.localeCompare(a.name),
  },
  {
    key: "status",
    label: "Status",
    compare: (a, b) => a.status.localeCompare(b.status),
  },
  {
    key: "newest",
    label: "Newest First",
    compare: (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  },
  {
    key: "oldest",
    label: "Oldest First",
    compare: (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
];

const filterOptions: FilterOption<Shop>[] = [
  {
    key: "approved",
    label: "Approved",
    predicate: (s) => s.status === "approved",
  },
  {
    key: "pending",
    label: "Pending Approval",
    predicate: (s) => s.status === "pending_approval",
  },
  {
    key: "rejected",
    label: "Rejected",
    predicate: (s) => s.status === "rejected",
  },
];

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="px-4 pt-4">
      <Card className="items-center gap-3 border-ember-orange bg-surface-recessed">
        <Ionicons name="alert-circle-outline" size={24} color="#ff3e00" />
        <Text variant="body" color="ember" className="text-center">
          Failed to load shops. Pull down to retry or tap below.
        </Text>
        <Button variant="secondary" onPress={onRetry}>
          Retry
        </Button>
      </Card>
    </View>
  );
}

export default function AllShopsScreen() {
  const queryClient = useQueryClient();
  const { data: shops, isLoading, isError, refetch, isRefetching } = useShops();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const handleToggleView = useCallback(() => {
    setViewMode((prev) => (prev === "grid" ? "map" : "grid"));
  }, []);

  const handleShopPress = useCallback((shop: Shop) => {
    router.push(`/(admin)/shops/${shop.id}`);
  }, []);

  const handlePlaceOrder = useCallback((shop: Shop) => {
    router.push(`/(admin)/orders/new?shopId=${shop.id}`);
  }, []);

  const handleShopLongPress = useCallback(
    (shop: Shop) => {
      if (!isAdmin) return;
      Alert.alert("Manage Shop", `Manage "${shop.name}" (${shop.status})`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Shop",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient(`/api/shops/${shop.id}`, { method: "DELETE" });
              queryClient.invalidateQueries({ queryKey: ["shops"] });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to delete",
              );
            }
          },
        },
      ]);
    },
    [isAdmin, queryClient],
  );

  const handleRegisterShop = useCallback(() => {
    router.push("/(admin)/shops/new");
  }, []);

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center justify-between px-4 pt-3 pb-1 border-b border-stone-border bg-surface">
        <Text variant="heading-sm" color="charcoal">
          Outlets ({shops?.length ?? 0})
        </Text>
        <TouchableOpacity
          onPress={handleRegisterShop}
          className="flex-row items-center gap-1.5 bg-midnight px-3.5 py-2 rounded-full shadow-sm active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel="Register New Shop"
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text
            variant="label-medium"
            className="font-semibold text-xs text-white"
          >
            Register Shop
          </Text>
        </TouchableOpacity>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FilterToolbar
          data={shops ?? []}
          searchPlaceholder="Search shops by name, address, owner..."
          searchKeys={["name", "address", "phone", "ownerName"]}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        >
          {(filteredShops) => (
            <View className="flex-1 relative bg-canvas">
              <View
                style={{
                  flex: 1,
                  opacity: viewMode === "grid" ? 1 : 0,
                  zIndex: viewMode === "grid" ? 1 : 0,
                  pointerEvents: viewMode === "grid" ? "auto" : "none",
                }}
              >
                <ShopGridView
                  shops={filteredShops}
                  isLoading={isLoading}
                  isRefetching={isRefetching}
                  onRefresh={refetch}
                  onShopPress={handleShopPress}
                  onShopLongPress={isAdmin ? handleShopLongPress : undefined}
                  onPlaceOrder={handlePlaceOrder}
                />
              </View>
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: viewMode === "map" ? 1 : 0,
                  zIndex: viewMode === "map" ? 1 : 0,
                  pointerEvents: viewMode === "map" ? "auto" : "none",
                }}
              >
                <ShopMapView
                  shops={filteredShops}
                  onShopPress={handleShopPress}
                  onPlaceOrder={handlePlaceOrder}
                />
              </View>
            </View>
          )}
        </FilterToolbar>
      )}

      {/* Floating Action Button to toggle between Grid View and Map View */}
      <ShopViewToggleFAB viewMode={viewMode} onToggle={handleToggleView} />
    </View>
  );
}
