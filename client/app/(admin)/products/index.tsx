import { useCallback } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { Card } from "../../../src/components/ui/card";
import { useProducts } from "../../../src/hooks/queries/useProducts";
import { ProductCard, AddProductCard } from "../../../src/features/products";
import { FilterToolbar, type SortOption, type FilterOption } from "../../../src/components/shared/FilterToolbar";
import { useAuthStore } from "../../../src/stores/authStore";
import { apiClient } from "../../../src/lib/apiClient";
import type { Product } from "../../../src/types";

const sortOptions: SortOption<Product>[] = [
  {
    key: "name",
    label: "Name",
    compare: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: "price_asc",
    label: "Price: Low to High",
    compare: (a, b) => parseFloat(a.price) - parseFloat(b.price),
  },
  {
    key: "price_desc",
    label: "Price: High to Low",
    compare: (a, b) => parseFloat(b.price) - parseFloat(a.price),
  },
  {
    key: "stock",
    label: "Stock",
    compare: (a, b) => a.stockQuantity - b.stockQuantity,
  },
];

const filterOptions: FilterOption<Product>[] = [
  {
    key: "drinks",
    label: "Drinks",
    predicate: (p) => p.category === "Drinks",
  },
  {
    key: "snacks",
    label: "Snacks",
    predicate: (p) => p.category === "Snacks",
  },
  {
    key: "dairy",
    label: "Dairy",
    predicate: (p) => p.category === "Dairy",
  },
  {
    key: "pantry",
    label: "Pantry",
    predicate: (p) => p.category === "Pantry",
  },
];

function SkeletonGrid() {
  return (
    <View className="flex-row flex-wrap px-4 gap-3 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="w-[48%] gap-3 opacity-60">
          <View className="w-full h-32 bg-stone-border rounded-lg" />
          <View className="gap-2.5 p-1">
            <View className="bg-stone-border rounded w-[50%] h-3" />
            <View className="bg-stone-border rounded w-[90%] h-4" />
            <View className="bg-stone-border rounded w-[60%] h-5" />
            <View className="bg-stone-border rounded w-[40%] h-3" />
          </View>
        </Card>
      ))}
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="px-4 pt-4">
      <Card className="items-center gap-3 border-ember-orange bg-surface-recessed">
        <Ionicons name="alert-circle-outline" size={24} color="#ff3e00" />
        <Text variant="body" color="ember" className="text-center">
          Failed to load products. Pull down to retry or tap below.
        </Text>
        <Button variant="secondary" onPress={onRetry}>
          Retry
        </Button>
      </Card>
    </View>
  );
}

export default function ProductCatalogScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: products, isLoading, isError, refetch, isRefetching } = useProducts();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const handleProductPress = useCallback((product: Product) => {
    router.push(`/(admin)/products/${product.id}`);
  }, []);

  const handleAddProduct = useCallback(() => {
    router.push("/(admin)/products/new");
  }, []);

  const handleProductLongPress = useCallback((product: Product) => {
    Alert.alert(
      "Delete Product",
      `Delete "${product.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient(`/api/products/${product.id}`, { method: "DELETE" });
              queryClient.invalidateQueries({ queryKey: ["products"] });
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete");
            }
          },
        },
      ],
    );
  }, [queryClient]);

  return (
    <View className="flex-1 bg-canvas">
      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FilterToolbar
          data={products ?? []}
          searchPlaceholder="Search products..."
          searchKeys={["name", "sku", "category"]}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        >
          {(filtered) => (
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor="#343433"
                  colors={["#343433"]}
                />
              }
              contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            >
              {filtered.length === 0 ? (
                <View className="items-center px-8 pt-12">
                  <View className="w-20 h-20 rounded-full bg-surface-recessed items-center justify-center mb-4">
                    <Ionicons name="cube-outline" size={40} color="#848281" />
                  </View>
                  <Text variant="heading-sm" color="charcoal" className="text-center mb-2">
                    No products yet
                  </Text>
                  <Text variant="body" color="ash" className="text-center leading-6">
                    Tap the + button to add your first product.
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap px-4 gap-3 pt-3">
                  {filtered.map((product) => (
                    <View key={product.id} className="w-[48%]">
                      <ProductCard
                        product={product}
                        onPress={() => handleProductPress(product)}
                        onLongPress={isAdmin ? () => handleProductLongPress(product) : undefined}
                      />
                    </View>
                  ))}
                  <AddProductCard onPress={handleAddProduct} />
                </View>
              )}
            </ScrollView>
          )}
        </FilterToolbar>
      )}

      {/* FAB: Add Product */}
      <TouchableOpacity
        onPress={handleAddProduct}
        className="absolute w-14 h-14 rounded-full bg-midnight items-center justify-center right-5"
        style={{
          bottom: insets.bottom + 76,
          shadowColor: "#121212",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 6,
        }}
        activeOpacity={0.85}
        accessibilityLabel="Add new product"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
