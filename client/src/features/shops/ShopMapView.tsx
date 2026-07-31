import { useState, useCallback, useMemo, useRef } from "react";
import { View } from "react-native";
import type BottomSheet from "@gorhom/bottom-sheet";
import type { Region } from "react-native-maps";
import {
  ShopMapCanvas,
  type ShopMapCanvasRef,
} from "./components/ShopMapCanvas";
import { ShopBottomSheetDrawer } from "./components/ShopBottomSheetDrawer";
import type { Shop } from "../../types";

interface ShopMapViewProps {
  shops: Shop[];
  onShopPress: (shop: Shop) => void;
  onPlaceOrder?: (shop: Shop) => void;
  testID?: string;
}

function isShopInRegion(lat: number, lng: number, region: Region): boolean {
  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lngMin = region.longitude - region.longitudeDelta / 2;
  const lngMax = region.longitude + region.longitudeDelta / 2;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

export function ShopMapView({
  shops,
  onShopPress,
  onPlaceOrder,
  testID = "shop-map-view",
}: ShopMapViewProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const canvasRef = useRef<ShopMapCanvasRef>(null);

  const [selectedShopId, setSelectedShopId] = useState<string | null>(
    shops[0]?.id ?? null,
  );

  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null);

  // Shops currently visible in the map viewport
  const visibleShops = useMemo(() => {
    if (!visibleRegion) return shops;
    return shops.filter((s) => {
      const lat = s.latitude ? parseFloat(s.latitude) : NaN;
      const lng = s.longitude ? parseFloat(s.longitude) : NaN;
      if (isNaN(lat) || isNaN(lng)) return false;
      return isShopInRegion(lat, lng, visibleRegion);
    });
  }, [shops, visibleRegion]);

  const { defaultCenterLat, defaultCenterLng } = useMemo(() => {
    const valid = shops.filter(
      (s) => s.latitude && !isNaN(parseFloat(s.latitude)),
    );
    if (valid.length === 0)
      return { defaultCenterLat: 19.076, defaultCenterLng: 72.8777 };
    return {
      defaultCenterLat:
        valid.reduce((acc, s) => acc + parseFloat(s.latitude!), 0) /
        valid.length,
      defaultCenterLng:
        valid.reduce((acc, s) => acc + parseFloat(s.longitude!), 0) /
        valid.length,
    };
  }, [shops]);

  // Tapped a shop from the bottom sheet list → pan map + highlight
  const handleSelectShopFromList = useCallback((shop: Shop) => {
    setSelectedShopId(shop.id);
    // Pan the map to this shop's location
    const lat = parseFloat(shop.latitude || "");
    const lng = parseFloat(shop.longitude || "");
    if (!isNaN(lat) && !isNaN(lng)) {
      canvasRef.current?.centerOnShop(lat, lng);
    }
    // Snap the sheet up to show the selected shop card
    sheetRef.current?.snapToIndex(1);
  }, []);

  // Tapped a marker on the map → highlight (pan already done by canvas)
  const handleSelectShopFromMap = useCallback((shopId: string) => {
    if (!shopId) {
      setSelectedShopId(null);
      return;
    }
    setSelectedShopId(shopId);
    sheetRef.current?.snapToIndex(1);
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    setVisibleRegion(region);
  }, []);

  return (
    <View testID={testID} className="flex-1 bg-canvas relative">
      <ShopMapCanvas
        ref={canvasRef}
        shops={shops}
        defaultCenterLat={defaultCenterLat}
        defaultCenterLng={defaultCenterLng}
        onSelectShopFromMap={handleSelectShopFromMap}
        selectedShopId={selectedShopId}
        onRegionChange={handleRegionChange}
      />

      <ShopBottomSheetDrawer
        ref={sheetRef}
        shops={visibleShops}
        selectedShopId={selectedShopId}
        onSelectShopFromList={handleSelectShopFromList}
        onShopPress={onShopPress}
        onPlaceOrder={onPlaceOrder}
      />
    </View>
  );
}
