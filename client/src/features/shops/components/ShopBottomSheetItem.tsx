import { useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui/text";
import { Button } from "../../../components/ui/button";
import type { Shop } from "../../../types";

interface ShopBottomSheetItemProps {
  shop: Shop;
  isSelected?: boolean;
  onSelect: (shop: Shop) => void;
  onShopPress: (shop: Shop) => void;
  onPlaceOrder?: (shop: Shop) => void;
  testID?: string;
}

export function ShopBottomSheetItem({
  shop,
  isSelected,
  onSelect,
  onShopPress,
  onPlaceOrder,
  testID = `shop-item-${shop.id}`,
}: ShopBottomSheetItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(shop);
  }, [onSelect, shop]);

  const handleDetails = useCallback(() => {
    onShopPress(shop);
  }, [onShopPress, shop]);

  const handleAction = useCallback(() => {
    if (onPlaceOrder) {
      onPlaceOrder(shop);
    } else {
      onShopPress(shop);
    }
  }, [onPlaceOrder, onShopPress, shop]);

  const isApproved = shop.status === "approved";
  const isPending = shop.status === "pending_approval";

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handleSelect}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Shop ${shop.name}${!isApproved ? `, status ${shop.status}` : ""}`}
      className={`p-4 mx-4 mb-3 rounded-xl border transition-colors ${
        isSelected
          ? "bg-surface border-midnight shadow-md"
          : "bg-surface border-stone-border shadow-sm"
      }`}
    >
      <View className="flex-row items-start">
        {/* Shop avatar */}
        <View
          className={`w-11 h-11 rounded-full items-center justify-center mr-3 border-2 ${
            isSelected
              ? "bg-midnight border-midnight"
              : "bg-surface-recessed border-stone-border"
          }`}
        >
          <Ionicons
            name="storefront"
            size={20}
            color={isSelected ? "#ffffff" : "#ff3e00"}
          />
        </View>

        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2 mb-1">
            <Text variant="heading-sm" color="charcoal" numberOfLines={1}>
              {shop.name}
            </Text>
            {!isApproved && (
              <View
                className={`px-2 py-0.5 rounded-full flex-row items-center gap-1 ${
                  isPending
                    ? "bg-amber-100 border border-amber-300"
                    : "bg-red-100 border border-red-300"
                }`}
              >
                <Ionicons
                  name={isPending ? "time-outline" : "alert-circle-outline"}
                  size={11}
                  color={isPending ? "#d97706" : "#dc2626"}
                />
                <Text
                  variant="caption"
                  className={`text-[9px] font-bold ${
                    isPending ? "text-amber-800" : "text-red-800"
                  }`}
                >
                  {isPending ? "Pending Approval" : "Rejected"}
                </Text>
              </View>
            )}
          </View>

          {shop.ownerName && (
            <Text variant="caption" color="ash" numberOfLines={1}>
              Owner: {shop.ownerName}
            </Text>
          )}

          {shop.address && (
            <Text
              variant="caption"
              color="ash"
              numberOfLines={1}
              className="mt-0.5"
            >
              📍 {shop.address}
            </Text>
          )}
        </View>

        <TouchableOpacity
          testID={`shop-details-btn-${shop.id}`}
          onPress={handleDetails}
          className="w-9 h-9 rounded-full bg-surface-recessed items-center justify-center border border-stone-border"
          accessibilityLabel={`View details for ${shop.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={18} color="#474645" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center gap-3 pt-3 border-t border-stone-border mt-3">
        <Button
          variant={isApproved ? "primary" : "secondary"}
          onPress={handleAction}
          className="flex-1 py-2.5 rounded-full"
          testID={`shop-action-btn-${shop.id}`}
        >
          {isApproved
            ? "Place Order"
            : isPending
              ? "Review Approval"
              : "View Details"}
        </Button>
      </View>
    </TouchableOpacity>
  );
}
