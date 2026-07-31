import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFormContext, useWatch } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import * as Location from "expo-location";
import { FormInputController } from "../../components/shared";
import { Text } from "../../components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { ShopMapCanvas } from "./components/ShopMapCanvas";
import { LocationPickerModal } from "./components/LocationPickerModal";
import type { Shop } from "../../types";

interface Step2ShopLocationProps {
  onDataChange: (data: Record<string, any>) => void;
  fieldErrors: Record<string, string>;
  initialData: Record<string, any>;
}

interface AddressSuggestion {
  title: string;
  subtitle: string;
  street: string;
  city?: string;
  state?: string;
  pinCode?: string;
  lat: number;
  lng: number;
}

export function Step2ShopLocation({
  onDataChange,
  fieldErrors,
  initialData,
}: Step2ShopLocationProps) {
  const formContext = useFormContext<FieldValues>();
  const control = formContext?.control;
  const setValue = useCallback(
    (name: string, value: any, options?: any) => {
      formContext?.setValue?.(name, value, options);
    },
    [formContext],
  );

  const [isLocating, setIsLocating] = useState(false);
  const [isLookupPinCode, setIsLookupPinCode] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);

  const isSelectingSuggestionRef = useRef(false);

  const watchedLat = useWatch({ control, name: "latitude" });
  const watchedLng = useWatch({ control, name: "longitude" });
  const watchedName = useWatch({ control, name: "name" }) || "New Shop";

  const watchedAddress = useWatch({ control, name: "address" });
  const watchedCity = useWatch({ control, name: "city" });
  const watchedState = useWatch({ control, name: "state" });
  const watchedPinCode = useWatch({ control, name: "pinCode" });

  // Coordinates for the mini-map preview (defaulting to Mumbai center if unset)
  const currentLat = watchedLat !== undefined ? Number(watchedLat) : 19.076;
  const currentLng = watchedLng !== undefined ? Number(watchedLng) : 72.8777;

  // 1. Live Address Autocomplete Suggestions (Photon/OpenStreetMap)
  useEffect(() => {
    if (isSelectingSuggestionRef.current) {
      isSelectingSuggestionRef.current = false;
      return;
    }

    const query = (watchedAddress || "").trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,
        );
        const data = await res.json();
        if (data && data.features) {
          const items: AddressSuggestion[] = data.features.map((feat: any) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [72.8777, 19.076];
            const name = props.name || props.street || "";
            const street = props.street || props.name || "";
            const city = props.city || props.district || props.county || "";
            const state = props.state || "";
            const pinCode = props.postcode || "";

            const title = [name, street].filter(Boolean)[0] || query;
            const subtitle = [city, state, props.country]
              .filter(Boolean)
              .join(", ");

            return {
              title,
              subtitle,
              street: [name, street]
                .filter((v, i, a) => v && a.indexOf(v) === i)
                .join(", "),
              city,
              state,
              pinCode,
              lat: coords[1],
              lng: coords[0],
            };
          });
          setAddressSuggestions(items);
        }
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [watchedAddress]);

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    isSelectingSuggestionRef.current = true;
    setValue("address", item.street || item.title, { shouldValidate: true });
    if (item.city) setValue("city", item.city, { shouldValidate: true });
    if (item.state) setValue("state", item.state, { shouldValidate: true });
    if (item.pinCode)
      setValue("pinCode", item.pinCode, { shouldValidate: true });
    setValue("latitude", item.lat);
    setValue("longitude", item.lng);
    setAddressSuggestions([]);
    setLocationStatus(
      `Selected address (${item.lat.toFixed(4)}, ${item.lng.toFixed(4)})`,
    );
  };

  // 2. Auto-Fill City & State when a valid 6-digit PIN Code is typed
  useEffect(() => {
    const cleanPin = (watchedPinCode || "").trim();
    if (!/^\d{6}$/.test(cleanPin)) return;

    const fetchCityStateFromPin = async () => {
      setIsLookupPinCode(true);
      try {
        const res = await fetch(
          `https://api.postalpincode.in/pincode/${cleanPin}`,
        );
        const data = await res.json();
        if (
          data &&
          data[0] &&
          data[0].Status === "Success" &&
          data[0].PostOffice?.[0]
        ) {
          const po = data[0].PostOffice[0];
          const detectedCity = po.District || po.Block || po.Name;
          const detectedState = po.State;
          if (detectedCity)
            setValue("city", detectedCity, { shouldValidate: true });
          if (detectedState)
            setValue("state", detectedState, { shouldValidate: true });
          setLocationStatus(`Auto-filled City & State from PIN ${cleanPin}`);

          try {
            const geoRes = await Location.geocodeAsync(`${cleanPin}, India`);
            if (geoRes && geoRes.length > 0) {
              setValue("latitude", geoRes[0].latitude);
              setValue("longitude", geoRes[0].longitude);
            }
          } catch {}
          setIsLookupPinCode(false);
          return;
        }
      } catch {}

      try {
        const results = await Location.geocodeAsync(`${cleanPin}, India`);
        if (results && results.length > 0) {
          const { latitude, longitude } = results[0];
          setValue("latitude", latitude);
          setValue("longitude", longitude);
          const [revRes] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          if (revRes) {
            if (revRes.city || revRes.subregion)
              setValue("city", revRes.city || revRes.subregion || "", {
                shouldValidate: true,
              });
            if (revRes.region)
              setValue("state", revRes.region, { shouldValidate: true });
            setLocationStatus(`Auto-filled City & State from PIN ${cleanPin}`);
          }
        }
      } catch {
      } finally {
        setIsLookupPinCode(false);
      }
    };

    const timer = setTimeout(fetchCityStateFromPin, 400);
    return () => clearTimeout(timer);
  }, [watchedPinCode, setValue]);

  const handleCaptureGPS = async () => {
    setIsLocating(true);
    setLocationStatus(null);
    try {
      let lat = 19.076;
      let lng = 72.8777;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {}

      setValue("latitude", lat);
      setValue("longitude", lng);

      try {
        const [addressObj] = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        if (addressObj) {
          const streetStr = [addressObj.name, addressObj.street]
            .filter(Boolean)
            .join(", ");
          if (streetStr)
            setValue("address", streetStr, { shouldValidate: true });
          if (addressObj.city || addressObj.subregion)
            setValue("city", addressObj.city || addressObj.subregion || "", {
              shouldValidate: true,
            });
          if (addressObj.region)
            setValue("state", addressObj.region, { shouldValidate: true });
          if (addressObj.postalCode)
            setValue("pinCode", addressObj.postalCode, {
              shouldValidate: true,
            });
          setLocationStatus(
            `Auto-filled address from GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          );
        } else {
          setLocationStatus(
            `Captured GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          );
        }
      } catch {
        setLocationStatus(
          `Captured GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        );
      }
    } catch (e) {
      setValue("latitude", 19.076);
      setValue("longitude", 72.8777);
      setLocationStatus("Set standard store GPS (19.0760, 72.8777)");
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapPressLocation = async (coord: {
    latitude: number;
    longitude: number;
  }) => {
    const { latitude, longitude } = coord;
    setValue("latitude", latitude);
    setValue("longitude", longitude);
    try {
      const [addressObj] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (addressObj) {
        const streetStr = [addressObj.name, addressObj.street]
          .filter(Boolean)
          .join(", ");
        if (streetStr) setValue("address", streetStr, { shouldValidate: true });
        if (addressObj.city || addressObj.subregion)
          setValue("city", addressObj.city || addressObj.subregion || "", {
            shouldValidate: true,
          });
        if (addressObj.region)
          setValue("state", addressObj.region, { shouldValidate: true });
        if (addressObj.postalCode)
          setValue("pinCode", addressObj.postalCode, { shouldValidate: true });
        setLocationStatus(
          `Pinned location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) & auto-filled address`,
        );
      } else {
        setLocationStatus(
          `Pinned location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        );
      }
    } catch {
      setLocationStatus(
        `Pinned location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      );
    }
  };

  const handleConfirmLocationFromModal = (data: {
    address: string;
    city: string;
    state: string;
    pinCode: string;
    latitude: number;
    longitude: number;
  }) => {
    if (data.address)
      setValue("address", data.address, { shouldValidate: true });
    if (data.city) setValue("city", data.city, { shouldValidate: true });
    if (data.state) setValue("state", data.state, { shouldValidate: true });
    if (data.pinCode)
      setValue("pinCode", data.pinCode, { shouldValidate: true });
    setValue("latitude", data.latitude);
    setValue("longitude", data.longitude);
    setLocationStatus(
      `Confirmed map location (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})`,
    );
  };

  const mockShopForMap: Shop[] = useMemo(
    () => [
      {
        id: "preview-pin",
        tenantId: "temp",
        name: watchedName,
        ownerName: null,
        phone: "",
        address: [watchedAddress, watchedCity].filter(Boolean).join(", "),
        latitude: String(currentLat),
        longitude: String(currentLng),
        status: "approved",
        createdAt: new Date().toISOString(),
      },
    ],
    [watchedName, watchedAddress, watchedCity, currentLat, currentLng],
  );

  return (
    <View className="gap-6 py-4">
      <View className="items-center text-center gap-1.5 mb-2">
        <Text
          variant="caption"
          color="ash"
          className="tracking-widest uppercase"
        >
          Step 2 of 2
        </Text>
        <Text variant="heading" color="charcoal" className="text-2xl font-bold">
          Location Details
        </Text>
        <Text variant="body" color="ash" className="text-center">
          Tap the locator button to pick your exact store location on a
          full-page map.
        </Text>
      </View>

      {/* Full Page Map Locator Banner */}
      <View className="p-3.5 bg-surface-recessed border border-stone-border rounded-xl gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1 mr-2">
            <Ionicons name="map-sharp" size={22} color="#ff3e00" />
            <View className="flex-1">
              <Text
                variant="label-medium"
                color="charcoal"
                className="font-semibold text-sm"
              >
                Interactive Map Location Picker
              </Text>
              <Text variant="caption" color="ash" className="text-xs">
                {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setIsMapModalOpen(true)}
            className="flex-row items-center gap-1.5 bg-primary px-3.5 py-2 rounded-full active:opacity-90 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel="Open Full-Screen Map Location Picker"
          >
            <Ionicons name="expand" size={16} color="#ffffff" />
            <Text
              variant="caption"
              className="font-semibold text-white text-xs"
            >
              Open Full Map
            </Text>
          </TouchableOpacity>
        </View>
        {locationStatus && (
          <Text
            variant="caption"
            color="charcoal"
            className="text-xs text-center font-medium mt-1"
          >
            ✓ {locationStatus}
          </Text>
        )}
      </View>

      {/* 1. Street Address + Locator Icon Button */}
      <View className="relative z-20 gap-1">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <FormInputController
              name="address"
              control={control}
              label="Street Address"
              placeholder="Type street name for suggestions (e.g. MG Road)"
              icon={
                <Ionicons name="location-outline" size={20} color="#848281" />
              }
              required
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={() => setIsMapModalOpen(true)}
            className="mt-6 p-3 bg-surface border border-stone-border rounded-xl active:bg-surface-recessed"
            accessibilityRole="button"
            accessibilityLabel="Open Map Picker for Street Address"
          >
            <Ionicons
              name="navigate-circle-outline"
              size={24}
              color="#ff3e00"
            />
          </TouchableOpacity>
        </View>

        {isSearchingAddress && (
          <View className="absolute right-14 top-9">
            <ActivityIndicator size="small" color="#ff3e00" />
          </View>
        )}
        {addressSuggestions.length > 0 && (
          <View className="mt-1 border border-stone-border bg-surface rounded-xl shadow-lg overflow-hidden z-30">
            <View className="px-3 py-2 bg-surface-recessed border-b border-stone-border">
              <Text
                variant="caption"
                color="ash"
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Address Suggestions
              </Text>
            </View>
            {addressSuggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item.title}-${index}`}
                onPress={() => handleSelectSuggestion(item)}
                className="flex-row items-center gap-3 p-3 border-b border-stone-border/40 hover:bg-surface-recessed active:bg-surface-recessed"
              >
                <Ionicons name="location-sharp" size={18} color="#ff3e00" />
                <View className="flex-1">
                  <Text
                    variant="label-medium"
                    color="charcoal"
                    className="font-semibold text-sm"
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text variant="caption" color="ash" className="text-xs">
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 2. PIN Code (Required, placed directly below Street Address) */}
      <View className="relative gap-1">
        <FormInputController
          name="pinCode"
          control={control}
          label="PIN Code"
          placeholder="6-digit PIN code (e.g. 400001)"
          keyboardType="number-pad"
          maxLength={6}
          icon={<Ionicons name="mail-outline" size={20} color="#848281" />}
          required
        />
        {isLookupPinCode && (
          <View className="absolute right-3 top-9">
            <ActivityIndicator size="small" color="#ff3e00" />
          </View>
        )}
      </View>

      {/* 3. City & State Grid (Required) */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormInputController
            name="city"
            control={control}
            label="City"
            placeholder="e.g. Mumbai"
            required
          />
        </View>
        <View className="flex-1">
          <FormInputController
            name="state"
            control={control}
            label="State"
            placeholder="e.g. Maharashtra"
            required
          />
        </View>
      </View>

      {/* 4. Mini Map Location Preview Card */}
      <View className="gap-2 pt-2 border-t border-stone-border">
        <View className="flex-row items-center justify-between">
          <Text variant="label-medium" color="charcoal">
            Location Pin Preview
          </Text>
          <TouchableOpacity
            onPress={() => setIsMapModalOpen(true)}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="expand" size={14} color="#ff3e00" />
            <Text
              variant="caption"
              color="ember"
              className="font-semibold text-xs"
            >
              Expand Full Map
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => setIsMapModalOpen(true)}
          activeOpacity={0.9}
          className="h-44 w-full rounded-xl overflow-hidden border border-stone-border bg-surface-recessed relative"
        >
          <ShopMapCanvas
            shops={mockShopForMap}
            defaultCenterLat={currentLat}
            defaultCenterLng={currentLng}
            selectedShopId="preview-pin"
            onSelectShopFromMap={() => {}}
            onPressLocation={handleMapPressLocation}
          />
        </TouchableOpacity>
      </View>

      {/* Full-Page Interactive Map Location Picker Modal */}
      <LocationPickerModal
        visible={isMapModalOpen}
        initialLat={currentLat}
        initialLng={currentLng}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={handleConfirmLocationFromModal}
      />
    </View>
  );
}
