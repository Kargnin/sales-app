import { useState, useEffect, useRef, useCallback } from "react";
import { View, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "../../../components/ui/text";
import { Button } from "../../../components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { ShopMapCanvas, type ShopMapCanvasRef } from "./ShopMapCanvas";

interface LocationPickerModalProps {
  visible: boolean;
  initialLat: number;
  initialLng: number;
  onClose: () => void;
  onConfirmLocation: (locationData: {
    address: string;
    city: string;
    state: string;
    pinCode: string;
    latitude: number;
    longitude: number;
  }) => void;
}

export function LocationPickerModal({
  visible,
  initialLat,
  initialLng,
  onClose,
  onConfirmLocation,
}: LocationPickerModalProps) {
  const mapRef = useRef<ShopMapCanvasRef>(null);
  const [currentLat, setCurrentLat] = useState(initialLat || 19.076);
  const [currentLng, setCurrentLng] = useState(initialLng || 72.8777);
  const [addressPreview, setAddressPreview] = useState(
    "Locating store location...",
  );
  const [detectedCity, setDetectedCity] = useState("");
  const [detectedState, setDetectedState] = useState("");
  const [detectedPin, setDetectedPin] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const reverseGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (addr) {
        const streetStr = [addr.name, addr.street, addr.subregion]
          .filter(Boolean)
          .join(", ");
        setAddressPreview(streetStr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setDetectedCity(addr.city || addr.subregion || "");
        setDetectedState(addr.region || "");
        setDetectedPin(addr.postalCode || "");
      } else {
        setAddressPreview(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setAddressPreview(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const lat = initialLat || 19.076;
      const lng = initialLng || 72.8777;
      setCurrentLat(lat);
      setCurrentLng(lng);
      reverseGeocode(lat, lng);
    }
  }, [visible, initialLat, initialLng, reverseGeocode]);

  const handleRegionChange = (coord: {
    latitude: number;
    longitude: number;
  }) => {
    const lat = coord.latitude;
    const lng = coord.longitude;
    setCurrentLat(lat);
    setCurrentLng(lng);

    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
    }

    reverseGeocodeTimerRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 350);
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        mapRef.current?.centerOnShop(lat, lng);
        reverseGeocode(lat, lng);
      }
    } catch {
      // fallback
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    onConfirmLocation({
      address: addressPreview,
      city: detectedCity,
      state: detectedState,
      pinCode: detectedPin,
      latitude: currentLat,
      longitude: currentLng,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-canvas relative">
        {/* Full-screen Map Container */}
        <View className="flex-1 w-full h-full relative">
          <ShopMapCanvas
            ref={mapRef}
            shops={[]}
            defaultCenterLat={currentLat}
            defaultCenterLng={currentLng}
            onSelectShopFromMap={() => {}}
            onRegionChange={(reg) => handleRegionChange(reg)}
            onPressLocation={(coord) => handleRegionChange(coord)}
          />

          {/* Fixed Zomato/Blinkit Style Center Pin Overlay */}
          <View
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: [{ translateX: -70 }, { translateY: -40 }],
            }}
            className="items-center justify-center pointer-events-none z-20"
          >
            <View className="bg-primary px-3 py-1.5 rounded-full shadow-lg border-2 border-white mb-1">
              <Text variant="caption" className="font-bold text-white text-xs">
                Set Outlet Location
              </Text>
            </View>
            <Ionicons name="location" size={44} color="#ff3e00" />
            <View className="w-3.5 h-1.5 rounded-full bg-black/40 mt-0.5" />
          </View>

          {/* Header Controls */}
          <View className="absolute top-12 left-4 right-4 z-30 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur-md items-center justify-center border border-stone-border shadow-md"
              accessibilityRole="button"
              accessibilityLabel="Close Location Picker"
            >
              <Ionicons name="close" size={22} color="#343433" />
            </TouchableOpacity>

            <View className="bg-surface/90 backdrop-blur-md px-4 py-2 rounded-full border border-stone-border shadow-md">
              <Text
                variant="label-medium"
                color="charcoal"
                className="font-bold text-xs uppercase tracking-wider"
              >
                Full Page Map Picker
              </Text>
            </View>
          </View>

          {/* Floating Locate Me Button */}
          <TouchableOpacity
            onPress={handleLocateMe}
            disabled={isLocating}
            className="absolute bottom-48 right-4 z-30 bg-surface/95 backdrop-blur-md p-3.5 rounded-full border border-stone-border shadow-lg"
            accessibilityRole="button"
            accessibilityLabel="Use My Location"
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#ff3e00" />
            ) : (
              <Ionicons name="locate" size={22} color="#ff3e00" />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Card Preview & Confirmation Action */}
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-stone-border p-5 rounded-t-3xl shadow-2xl gap-4 z-30">
          <View className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text
                variant="caption"
                color="ash"
                className="uppercase tracking-widest font-semibold text-xs"
              >
                Selected Outlet Address
              </Text>
              {isReverseGeocoding && (
                <ActivityIndicator size="small" color="#ff3e00" />
              )}
            </View>
            <Text
              variant="heading-sm"
              color="charcoal"
              numberOfLines={2}
              className="font-bold text-base"
            >
              {addressPreview}
            </Text>
            {detectedCity || detectedState || detectedPin ? (
              <Text
                variant="caption"
                color="ash"
                className="text-xs font-medium"
              >
                {[
                  detectedCity,
                  detectedState,
                  detectedPin ? `PIN: ${detectedPin}` : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            ) : null}
          </View>

          <Button
            variant="primary"
            onPress={handleConfirm}
            className="w-full py-3.5 rounded-xl"
          >
            Confirm Outlet Location
          </Button>
        </View>
      </View>
    </Modal>
  );
}
