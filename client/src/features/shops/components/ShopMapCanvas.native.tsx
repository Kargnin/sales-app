import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { View, Platform, TouchableOpacity } from "react-native";
import MapView, {
  Marker,
  Region,
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
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
  onRegionChange?: (region: Region) => void;
  testID?: string;
}

// ── Google Maps theme — minimal, matches app palette ─────────────────────

const mapTheme = [
  { elementType: "geometry", stylers: [{ color: "#f5f3f0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b6764" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f3f0" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#343433" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#848281" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e8e4df" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b6764" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#848281" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e8e4df" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#474645" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b6764" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dce8f0" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#848281" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#848281" }],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function parseCoordinate(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

// ── Component ────────────────────────────────────────────────────────────

export const ShopMapCanvas = forwardRef<ShopMapCanvasRef, ShopMapCanvasProps>(
  (
    {
      shops,
      defaultCenterLat,
      defaultCenterLng,
      onSelectShopFromMap,
      onPressLocation,
      selectedShopId,
      onRegionChange,
      testID = "shop-map-canvas",
    },
    ref,
  ) => {
    const mapRef = useRef<MapView>(null);
    const [isLocating, setIsLocating] = useState(false);
    const currentZoomRef = useRef(14);
    const visibleRegionRef = useRef<Region | null>(null);

    const deltaToZoom = useCallback((longitudeDelta: number) => {
      return Math.round(Math.log2(360 / longitudeDelta));
    }, []);

    const allCoords = useMemo<LatLng[]>(
      () =>
        shops
          .filter((s) => s.latitude && s.longitude)
          .map((s) => ({
            latitude: parseFloat(s.latitude!),
            longitude: parseFloat(s.longitude!),
          })),
      [shops],
    );

    const shopsWithCoords = useMemo(
      () =>
        shops.map((shop) => ({
          ...shop,
          _lat: parseCoordinate(shop.latitude, defaultCenterLat),
          _lng: parseCoordinate(shop.longitude, defaultCenterLng),
        })),
      [shops, defaultCenterLat, defaultCenterLng],
    );

    const defaultRegion: Region = useMemo(() => {
      if (shopsWithCoords.length === 0) {
        return {
          latitude: defaultCenterLat,
          longitude: defaultCenterLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
      }
      const avgLat =
        shopsWithCoords.reduce((sum, s) => sum + s._lat, 0) /
        shopsWithCoords.length;
      const avgLng =
        shopsWithCoords.reduce((sum, s) => sum + s._lng, 0) /
        shopsWithCoords.length;
      return {
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }, [shopsWithCoords, defaultCenterLat, defaultCenterLng]);

    useImperativeHandle(ref, () => ({
      centerOnShop: (lat: number, lng: number) => {
        mapRef.current?.animateCamera(
          { center: { latitude: lat, longitude: lng } },
          { duration: 400 },
        );
      },
    }));

    const fitAllCoords = useCallback(() => {
      if (allCoords.length > 0) {
        mapRef.current?.fitToCoordinates(allCoords, {
          edgePadding: { top: 60, right: 60, bottom: 120, left: 60 },
          animated: true,
        });
      }
    }, [allCoords]);

    const hasInitializedCameraRef = useRef(false);

    const handleMapReady = useCallback(() => {
      if (!hasInitializedCameraRef.current) {
        hasInitializedCameraRef.current = true;
        setTimeout(() => fitAllCoords(), 300);
      }
    }, [fitAllCoords]);

    const handleMarkerPress = useCallback(
      (shop: { _lat: number; _lng: number; id: string }) => {
        mapRef.current?.animateCamera(
          { center: { latitude: shop._lat, longitude: shop._lng } },
          { duration: 400 },
        );
        onSelectShopFromMap(shop.id);
      },
      [onSelectShopFromMap],
    );

    const handleNearMe = useCallback(async () => {
      setIsLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const targetZoom = Math.min(currentZoomRef.current + 3, 18);
        mapRef.current?.animateCamera(
          {
            center: {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            },
            zoom: targetZoom,
          },
          { duration: 500 },
        );
      } catch {
        // silently fail
      } finally {
        setIsLocating(false);
      }
    }, []);

    const handleRegionChangeComplete = useCallback(
      (region: Region) => {
        visibleRegionRef.current = region;
        currentZoomRef.current = deltaToZoom(region.longitudeDelta);
        onRegionChange?.(region);
      },
      [onRegionChange, deltaToZoom],
    );

    return (
      <View testID={testID} className="flex-1 w-full h-full bg-canvas">
        <MapView
          ref={mapRef}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          {...(Platform.OS === "android"
            ? ({ useTextureView: true } as any)
            : {})}
          style={{ width: "100%", height: "100%", backgroundColor: "#faf9f7" }}
          initialRegion={defaultRegion}
          nestedScrollEnabled={true}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          loadingEnabled={true}
          loadingBackgroundColor="#faf9f7"
          loadingIndicatorColor="#ff3e00"
          customMapStyle={Platform.OS === "android" ? mapTheme : undefined}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={(e) => {
            if (e.nativeEvent && e.nativeEvent.coordinate) {
              onPressLocation?.(e.nativeEvent.coordinate);
            }
          }}
        >
          {shopsWithCoords.map((shop) => {
            const isSelected = shop.id === selectedShopId;
            return (
              <Marker
                key={shop.id}
                testID={`shop-marker-${shop.id}`}
                coordinate={{ latitude: shop._lat, longitude: shop._lng }}
                onPress={() => handleMarkerPress(shop)}
                tracksViewChanges={false}
              >
                <View
                  style={{
                    width: isSelected ? 44 : 38,
                    height: isSelected ? 44 : 38,
                    borderRadius: isSelected ? 22 : 19,
                    backgroundColor: isSelected ? "#121212" : "#ff3e00",
                    borderWidth: 3,
                    borderColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <Ionicons
                    name="storefront"
                    size={isSelected ? 20 : 16}
                    color="#ffffff"
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Floating Controls: Near Me + Fit All */}
        <View className="absolute top-4 right-4 z-10 gap-3 items-center">
          {/* Near Me */}
          <TouchableOpacity
            testID="near-me-button"
            onPress={handleNearMe}
            disabled={isLocating}
            activeOpacity={0.8}
            className="bg-surface/95 backdrop-blur-md w-11 h-11 rounded-full border border-stone-border items-center justify-center shadow-md"
            accessibilityLabel="Recenter map to my location"
            accessibilityRole="button"
          >
            <Ionicons
              name={isLocating ? "sync" : "navigate"}
              size={20}
              color="#0090ff"
            />
          </TouchableOpacity>

          {/* Fit all shop markers */}
          {allCoords.length > 0 && (
            <TouchableOpacity
              testID="fit-all-button"
              onPress={fitAllCoords}
              activeOpacity={0.8}
              className="bg-surface/95 backdrop-blur-md w-11 h-11 rounded-full border border-stone-border items-center justify-center shadow-md"
              accessibilityLabel="Fit all shops on map"
              accessibilityRole="button"
            >
              <Ionicons name="expand" size={20} color="#474645" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  },
);

ShopMapCanvas.displayName = "ShopMapCanvas";
