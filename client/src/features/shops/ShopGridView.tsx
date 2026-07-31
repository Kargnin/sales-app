import { useCallback } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/ui/text";
import { Card } from "../../components/ui/card";
import { ShopCard } from "./ShopCard";
import type { Shop } from "../../types";

interface ShopGridViewProps {
  shops: Shop[];
  isLoading?: boolean;
  isRefetching?: boolean;
  onRefresh?: () => void;
  onShopPress: (shop: Shop) => void;
  onShopLongPress?: (shop: Shop) => void;
  onPlaceOrder?: (shop: Shop) => void;
}

function SkeletonShopGrid() {
  return (
    <View className="flex-row flex-wrap px-4 gap-3 pt-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card
          key={`shop-skeleton-${i}`}
          className="w-[48%] h-64 gap-3 opacity-60 pt-10 relative"
        >
          <View className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-stone-border" />
          <View className="gap-2 p-1 items-center">
            <View className="bg-stone-border rounded w-[70%] h-4 mt-2" />
            <View className="bg-stone-border rounded w-[90%] h-3" />
            <View className="bg-stone-border rounded w-[60%] h-3" />
            <View className="bg-stone-border rounded-full w-full h-8 mt-3" />
          </View>
        </Card>
      ))}
    </View>
  );
}

export function ShopGridView({
  shops,
  isLoading,
  isRefetching,
  onRefresh,
  onShopPress,
  onShopLongPress,
  onPlaceOrder,
}: ShopGridViewProps) {
  const insets = useSafeAreaInsets();

  const handleRefresh = useCallback(() => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  if (isLoading) {
    return <SkeletonShopGrid />;
  }

  return (
    <ScrollView
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(isRefetching)}
            onRefresh={handleRefresh}
            tintColor="#343433"
            colors={["#343433"]}
          />
        ) : undefined
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      className="flex-1"
    >
      {shops.length === 0 ? (
        <View className="items-center px-8 pt-16">
          <View className="w-20 h-20 rounded-full bg-surface-recessed items-center justify-center mb-4">
            <Ionicons name="storefront-outline" size={40} color="#848281" />
          </View>
          <Text
            variant="heading-sm"
            color="charcoal"
            className="text-center mb-2"
          >
            No shops found
          </Text>
          <Text variant="body" color="ash" className="text-center leading-6">
            Try adjusting your search or filters to see available shops.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap px-4 gap-3 pt-2">
          {shops.map((shop) => (
            <View key={shop.id} className="w-[48%] h-64">
              <ShopCard
                shop={shop}
                onPress={() => onShopPress(shop)}
                onLongPress={
                  onShopLongPress ? () => onShopLongPress(shop) : undefined
                }
                onPlaceOrder={
                  onPlaceOrder ? () => onPlaceOrder(shop) : undefined
                }
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
