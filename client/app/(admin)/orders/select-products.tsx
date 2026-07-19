import { useState, useMemo, useCallback } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { Card } from "../../../src/components/ui/card";
import { useProducts } from "../../../src/hooks/queries/useProducts";
import {
  StockBadge,
  QuantityStepper,
  CategoryTabs,
} from "../../../src/features/products";
import type { Product } from "../../../src/types";
import { formatCurrency } from "../../../src/lib/format";

const CATEGORIES = ["All", "Drinks", "Snacks", "Dairy", "Pantry"];

function ProductSelectCard({
  product,
  quantity,
  onIncrement,
  onDecrement,
}: {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <Card className="flex-row items-center gap-3">
      {/* Product Image */}
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          className="w-16 h-16 rounded-lg bg-surface-recessed"
          resizeMode="cover"
          accessibilityLabel={`${product.name} image`}
        />
      ) : (
        <View className="w-16 h-16 rounded-lg bg-surface-recessed items-center justify-center">
          <Ionicons name="cube-outline" size={24} color="#848281" />
        </View>
      )}

      {/* Product Info */}
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text
            variant="body"
            color="charcoal"
            className="font-body-semibold flex-1"
            numberOfLines={1}
          >
            {product.name}
          </Text>
          <StockBadge status={product.stockStatus} compact />
        </View>
        <Text variant="body" color="midnight" className="font-body-semibold">
          {formatCurrency(product.price)}
        </Text>
        {product.unit && (
          <Text variant="caption" color="ash">
            / {product.unit}
          </Text>
        )}
      </View>

      {/* Quantity Stepper */}
      <QuantityStepper
        quantity={quantity}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex-row items-center gap-3 opacity-60">
          <View className="w-16 h-16 bg-stone-border rounded-lg" />
          <View className="flex-1 gap-2">
            <View className="bg-stone-border rounded w-[60%] h-4" />
            <View className="bg-stone-border rounded w-[35%] h-4" />
          </View>
          <View className="bg-stone-border rounded w-20 h-8" />
        </Card>
      ))}
    </View>
  );
}

export default function SelectProductsScreen() {
  const insets = useSafeAreaInsets();
  const { data: products, isLoading, isError, refetch } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const totalItems = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + q, 0),
    [quantities],
  );

  const totalAmount = useMemo(() => {
    if (!products) return 0;
    return products.reduce((sum, p) => {
      return sum + (quantities[p.id] || 0) * parseFloat(p.price);
    }, 0);
  }, [products, quantities]);

  const handleIncrement = useCallback((productId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  }, []);

  const handleDecrement = useCallback((productId: string) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  }, []);

  const handleReviewOrder = useCallback(() => {
    const selectedProducts = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId, quantity: qty }));
    // TODO: Navigate to order review with selectedProducts
    router.back();
  }, [quantities]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen
        options={{
          title: "New Order",
        }}
      />

      <ScrollView className="flex-1">
        <View
          className="gap-4 pt-3"
          style={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Search Bar */}
          <View className="mx-4 flex-row items-center bg-surface border border-stone-border rounded-10 h-12 px-4 gap-2">
            <Ionicons name="search-outline" size={20} color="#848281" />
            <TextInput
              className="flex-1 font-body text-[15px] text-charcoal h-full"
              placeholder="Search products..."
              placeholderTextColor="#848281"
              value={searchQuery}
              onChangeText={handleSearchChange}
              accessibilityLabel="Search products"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityLabel="Clear search"
                className="p-1"
              >
                <Ionicons name="close-circle" size={18} color="#848281" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          <CategoryTabs
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
          />

          {/* Product List */}
          {isLoading && <LoadingSkeleton />}

          {isError && (
            <View className="px-4">
              <Card className="items-center gap-3 border-ember-orange bg-surface-recessed">
                <Ionicons name="alert-circle-outline" size={24} color="#ff3e00" />
                <Text variant="body" color="ember" className="text-center">
                  Failed to load products.
                </Text>
                <Button variant="secondary" onPress={() => refetch()}>
                  Retry
                </Button>
              </Card>
            </View>
          )}

          {!isLoading && !isError && filteredProducts.length === 0 && (
            <View className="items-center px-8 pt-8">
              <View className="w-16 h-16 rounded-full bg-surface-recessed items-center justify-center mb-3">
                <Ionicons name="search-outline" size={32} color="#848281" />
              </View>
              <Text variant="body" color="ash" className="text-center">
                {searchQuery
                  ? "No products match your search."
                  : "No products available."}
              </Text>
            </View>
          )}

          {!isLoading && !isError && filteredProducts.length > 0 && (
            <View className="px-4 gap-3">
              {filteredProducts.map((product) => (
                <ProductSelectCard
                  key={product.id}
                  product={product}
                  quantity={quantities[product.id] || 0}
                  onIncrement={() => handleIncrement(product.id)}
                  onDecrement={() => handleDecrement(product.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {totalItems > 0 && (
        <View
          className="border-t border-stone-border bg-surface px-4 py-3 gap-3"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="flex-row items-center justify-between">
            <Text variant="body" color="charcoal">
              Items:{" "}
              <Text variant="body" color="charcoal" className="font-body-semibold">
                {totalItems}
              </Text>
            </Text>
            <Text variant="body" color="midnight" className="font-body-semibold">
              Total: {formatCurrency(totalAmount)}
            </Text>
          </View>
          <Button onPress={handleReviewOrder} accessibilityLabel="Review order">
            Review Order
          </Button>
        </View>
      )}
    </View>
  );
}
