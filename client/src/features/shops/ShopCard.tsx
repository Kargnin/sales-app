import { useCallback } from "react";
import { View, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui/text";
import { Button } from "../../components/ui/button";
import type { Shop } from "../../types";

interface ShopCardProps {
  shop: Shop;
  onPress: () => void;
  onLongPress?: () => void;
  onPlaceOrder?: () => void;
}

export function ShopCard({
  shop,
  onPress,
  onLongPress,
  onPlaceOrder,
}: ShopCardProps) {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress();
  }, [onLongPress]);

  const handlePlaceOrder = useCallback(() => {
    if (onPlaceOrder) {
      onPlaceOrder();
    } else {
      onPress();
    }
  }, [onPlaceOrder, onPress]);

  const handleCall = useCallback(() => {
    if (shop.phone) {
      Linking.openURL(`tel:${shop.phone.replace(/\D/g, "")}`);
    }
  }, [shop.phone]);

  const isApproved = shop.status === "approved";
  const isPending = shop.status === "pending_approval";
  const isRejected = shop.status === "rejected";

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Shop ${shop.name}${!isApproved ? `, status: ${shop.status}` : ""}`}
      className="bg-surface border border-stone-border rounded-xl p-5 pt-12 mt-6 flex-1 flex-col items-center text-center relative shadow-sm justify-around"
    >
      {/* Mascot/Avatar Bubble — centered above the card */}
      <View className="absolute -top-8 left-0 right-0 items-center z-10">
        <View className="w-16 h-16 rounded-full bg-surface-recessed items-center justify-center border-2 border-surface shadow-md">
          <Ionicons name="storefront" size={28} color="#ff3e00" />
        </View>
      </View>

      {/* Show indicator ONLY for non-approved shops (Pending / Rejected) */}
      {!isApproved && (
        <View
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full flex-row items-center gap-1 ${
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
            {isPending ? "Pending" : "Rejected"}
          </Text>
        </View>
      )}

      {/* Shop Info — grouped together */}
      <View className="w-full">
        <Text
          variant="heading-sm"
          color="charcoal"
          numberOfLines={2}
          className="text-lg text-center mb-1 w-full mt-1"
        >
          {shop.name}
        </Text>

        {shop.ownerName && (
          <Text
            variant="caption"
            color="ash"
            numberOfLines={1}
            className="text-center"
          >
            Owner: {shop.ownerName}
          </Text>
        )}

        {shop.address && (
          <Text
            variant="caption"
            color="ash"
            numberOfLines={1}
            className="text-center"
          >
            {shop.address}
          </Text>
        )}

        {/* Pending Approval notice */}
        {isPending && (
          <Text
            variant="caption"
            color="warning"
            className="text-[11px] text-center font-medium mt-1"
          >
            Pending Approval First
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center gap-2 w-full">
        <Button
          variant={isApproved ? "primary" : "secondary"}
          onPress={handlePlaceOrder}
          className="flex-1 py-2.5 px-3 rounded-full"
        >
          {isApproved
            ? "Place Order"
            : isPending
              ? "Review Approval"
              : "View Details"}
        </Button>
        {shop.phone && (
          <TouchableOpacity
            onPress={handleCall}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-surface-recessed border border-stone-border items-center justify-center"
          >
            <Ionicons name="call" size={18} color="#ff3e00" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
