import { forwardRef, useImperativeHandle } from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui/text";
import type { Shop } from "../../../types";

export interface ShopMapCanvasRef {
  centerOnShop: (lat: number, lng: number) => void;
}

interface ShopMapCanvasProps {
  shops: Shop[];
  defaultCenterLat: number;
  defaultCenterLng: number;
  onSelectShopFromMap: (shopId: string) => void;
  onPressLocation?: (coordinate: {
    latitude: number;
    longitude: number;
  }) => void;
  selectedShopId?: string | null;
  onRegionChange?: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  testID?: string;
}

// Web placeholder — react-native-maps is a native module not available on web.
export const ShopMapCanvas = forwardRef<ShopMapCanvasRef, ShopMapCanvasProps>(
  (
    {
      shops,
      defaultCenterLat,
      defaultCenterLng,
      onPressLocation,
      testID = "shop-map-canvas",
    },
    ref,
  ) => {
    useImperativeHandle(ref, () => ({
      centerOnShop: () => {
        // no-op on web
      },
    }));

    const shopCount = shops.filter((s) => s.latitude && s.longitude).length;

    return (
      <TouchableOpacity
        testID={testID}
        activeOpacity={0.9}
        onPress={() => {
          onPressLocation?.({
            latitude: defaultCenterLat || 19.076,
            longitude: defaultCenterLng || 72.8777,
          });
        }}
        className="flex-1 w-full h-full bg-stone-border/40 justify-center items-center p-4 cursor-pointer"
      >
        <View className="items-center gap-2">
          <Ionicons name="location" size={40} color="#ff3e00" />
          <Text
            variant="label-medium"
            color="charcoal"
            className="text-center font-semibold"
          >
            {defaultCenterLat && defaultCenterLng
              ? `Pin: ${defaultCenterLat.toFixed(4)}, ${defaultCenterLng.toFixed(4)}`
              : "Tap to pin location"}
          </Text>
          <Text variant="caption" color="ash" className="text-center text-xs">
            Tap map preview to position pin & auto-fill address
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
);

ShopMapCanvas.displayName = "ShopMapCanvas";
