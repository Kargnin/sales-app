import { useMemo, useCallback, forwardRef } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Text } from "../../../components/ui/text";
import { ShopBottomSheetItem } from "./ShopBottomSheetItem";
import type { Shop } from "../../../types";

interface ShopBottomSheetDrawerProps {
  shops: Shop[];
  selectedShopId: string | null;
  onSelectShopFromList: (shop: Shop) => void;
  onShopPress: (shop: Shop) => void;
  onPlaceOrder?: (shop: Shop) => void;
  testID?: string;
}

export const ShopBottomSheetDrawer = forwardRef<
  BottomSheet,
  ShopBottomSheetDrawerProps
>(
  (
    {
      shops,
      selectedShopId,
      onSelectShopFromList,
      onShopPress,
      onPlaceOrder,
      testID = "shop-bottom-sheet",
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => ["22%", "45%", "85%"], []);

    const renderItem = useCallback(
      ({ item: shop }: { item: Shop }) => (
        <ShopBottomSheetItem
          shop={shop}
          isSelected={shop.id === selectedShopId}
          onSelect={onSelectShopFromList}
          onShopPress={onShopPress}
          onPlaceOrder={onPlaceOrder}
        />
      ),
      [selectedShopId, onSelectShopFromList, onShopPress, onPlaceOrder],
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        index={1} // Start at 45% split view
        enablePanDownToClose={false}
        handleIndicatorStyle={{
          width: 44,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#d1cfce",
        }}
        backgroundStyle={{
          backgroundColor: "#faf9f7",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderColor: "#f2f0ed",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 12,
        }}
      >
        <View testID={testID} className="flex-1">
          {/* Drawer Header Summary */}
          <View className="px-5 pb-3 flex-row items-center justify-between border-b border-stone-border/60">
            <View className="flex-row items-center gap-2">
              <Text variant="heading-sm" color="charcoal">
                Shops
              </Text>
              <View className="w-6 h-6 rounded-full bg-midnight items-center justify-center">
                <Text
                  variant="caption"
                  className="text-surface text-[11px] font-bold"
                >
                  {shops.length}
                </Text>
              </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-surface-recessed items-center justify-center border border-stone-border">
              <Ionicons name="storefront-outline" size={18} color="#848281" />
            </View>
          </View>

          {/* Scrollable Shop List Cards inside Bottom Sheet */}
          <BottomSheetFlatList
            data={shops}
            extraData={selectedShopId}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: insets.bottom + 90,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </BottomSheet>
    );
  },
);

ShopBottomSheetDrawer.displayName = "ShopBottomSheetDrawer";
