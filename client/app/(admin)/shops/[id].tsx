import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  ScrollView,
  Image,
  Share,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  router,
} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useForm,
  FormProvider,
  Controller,
  useFieldArray,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { Card } from "../../../src/components/ui/card";
import {
  FormInputController,
  ImageUploader,
} from "../../../src/components/shared";
import { useShop } from "../../../src/hooks/queries/useShops";
import {
  ShopMapCanvas,
  LocationPickerModal,
} from "../../../src/features/shops";
import { useAuthStore } from "../../../src/stores/authStore";
import { apiClient } from "../../../src/lib/apiClient";
import { updateShopSchema } from "@sales-app/shared";
import { useEditGuard } from "../../../src/hooks/useEditGuard";
import type { Shop } from "../../../src/types";

function LoadingSkeleton() {
  return (
    <View className="flex-1 bg-canvas">
      <ScrollView>
        <View className="gap-6 px-4 pt-4" style={{ paddingBottom: 120 }}>
          <View className="w-full h-56 bg-stone-border rounded-2xl" />
          <View className="gap-4">
            <View className="bg-stone-border rounded w-[40%] h-5" />
            <View className="bg-stone-border rounded w-[75%] h-7" />
            <View className="bg-stone-border rounded w-[35%] h-8" />
            <View className="bg-stone-border rounded w-full h-28 mt-2" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 bg-canvas items-center justify-center px-4">
      <Card className="items-center gap-3 border-ember-orange bg-surface-recessed p-6">
        <Ionicons name="alert-circle-outline" size={28} color="#ff3e00" />
        <Text variant="body" color="ember" className="text-center font-medium">
          Failed to load outlet details.
        </Text>
        <Button variant="secondary" onPress={onRetry}>
          Retry
        </Button>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Status Badge Pill Component
// ---------------------------------------------------------------------------
function ShopStatusBadge({ status }: { status: Shop["status"] }) {
  if (status === "approved") {
    return (
      <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
        <View className="w-2 h-2 rounded-full bg-emerald-500" />
        <Text
          variant="caption"
          className="font-semibold text-emerald-700 text-xs"
        >
          Approved
        </Text>
      </View>
    );
  }
  if (status === "rejected") {
    return (
      <View className="flex-row items-center gap-1.5 bg-ember-orange/10 px-3 py-1 rounded-full border border-ember-orange/30">
        <View className="w-2 h-2 rounded-full bg-ember-orange" />
        <Text
          variant="caption"
          className="font-semibold text-ember-orange text-xs"
        >
          Rejected
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
      <View className="w-2 h-2 rounded-full bg-amber-500" />
      <Text variant="caption" className="font-semibold text-amber-700 text-xs">
        Pending Approval
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Edit Form (rendered when isEditing is true; uses react-hook-form)
// ---------------------------------------------------------------------------

interface EditShopFormProps {
  shop: Shop;
  insets: ReturnType<typeof useSafeAreaInsets>;
  queryClient: ReturnType<typeof useQueryClient>;
  setIsEditing: (v: boolean) => void;
  setHasChanges: (v: boolean) => void;
  submitFormRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
  handleDelete: () => void;
}

function EditShopForm({
  shop,
  insets,
  queryClient,
  setIsEditing,
  setHasChanges,
  submitFormRef,
  handleDelete,
}: EditShopFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  let parsedCoOwners: Array<{ name: string; phone: string }> = [];
  try {
    if (shop.additionalOwners) {
      parsedCoOwners = JSON.parse(shop.additionalOwners);
    }
  } catch {
    parsedCoOwners = [];
  }

  const defaultValues = {
    name: shop.name,
    ownerName: shop.ownerName ?? "",
    phone: shop.phone,
    address: shop.address ?? "",
    imageUrl: shop.imageUrl ?? null,
    additionalOwners: parsedCoOwners,
    latitude: shop.latitude ? Number(shop.latitude) : 19.076,
    longitude: shop.longitude ? Number(shop.longitude) : 72.8777,
  };

  const methods = useForm({
    resolver: zodResolver(updateShopSchema as any),
    defaultValues,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isDirty },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalOwners",
  });

  const watchedLat = watch("latitude");
  const watchedLng = watch("longitude");

  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty, setHasChanges]);

  const onSave = useCallback(
    async (data: typeof defaultValues): Promise<boolean> => {
      setIsSaving(true);
      try {
        await apiClient(`/api/shops/${shop.id}`, {
          method: "PATCH",
          body: {
            name: data.name.trim(),
            ownerName: data.ownerName?.trim() || null,
            phone: data.phone.trim(),
            address: data.address?.trim() || null,
            imageUrl: data.imageUrl || null,
            additionalOwners: data.additionalOwners || [],
            latitude:
              data.latitude !== undefined ? Number(data.latitude) : undefined,
            longitude:
              data.longitude !== undefined ? Number(data.longitude) : undefined,
          },
        });

        queryClient.invalidateQueries({ queryKey: ["shops"] });
        queryClient.invalidateQueries({ queryKey: ["shops", shop.id] });
        setIsEditing(false);
        setHasChanges(false);
        return true;
      } catch (err) {
        Alert.alert(
          "Error Updating Shop",
          err instanceof Error ? err.message : "Failed to save outlet changes",
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [shop.id, queryClient, setIsEditing, setHasChanges],
  );

  useEffect(() => {
    submitFormRef.current = async () => {
      let success = false;
      await handleSubmit(
        async (data) => {
          success = await onSave(data);
        },
        () => {},
      )();
      return success;
    };

    return () => {
      submitFormRef.current = null;
    };
  }, [handleSubmit, onSave, submitFormRef]);

  const handleConfirmLocationFromModal = (data: {
    address: string;
    city: string;
    state: string;
    pinCode: string;
    latitude: number;
    longitude: number;
  }) => {
    if (data.address) setValue("address", data.address, { shouldDirty: true });
    setValue("latitude", data.latitude, { shouldDirty: true });
    setValue("longitude", data.longitude, { shouldDirty: true });
  };

  return (
    <FormProvider {...methods}>
      <ScrollView className="flex-1 bg-canvas">
        <View
          className="gap-6 px-4 pt-4"
          style={{ paddingBottom: insets.bottom + 120 }}
        >
          {/* Header Image Uploader */}
          <Controller
            name="imageUrl"
            control={control}
            render={({ field: { onChange, value } }) => (
              <ImageUploader
                imageUri={value ?? null}
                onImageSelected={onChange}
                onImageRemoved={() => onChange(null)}
              />
            )}
          />

          {/* Form Fields */}
          <View className="gap-4">
            <FormInputController
              name="name"
              control={control}
              label="Shop / Outlet Name"
              required
            />

            <FormInputController
              name="ownerName"
              control={control}
              label="Primary Owner Name"
            />

            <FormInputController
              name="phone"
              control={control}
              label="Primary Phone Number (10 digits)"
              keyboardType="number-pad"
              maxLength={10}
              required
            />

            {/* Dynamic Additional Co-Owners Section */}
            <View className="gap-3 pt-2 border-t border-stone-border">
              <View className="flex-row items-center justify-between">
                <Text variant="label-medium" color="charcoal">
                  Additional Co-Owners ({fields.length})
                </Text>
                <TouchableOpacity
                  onPress={() => append({ name: "", phone: "" })}
                  className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full active:opacity-90"
                >
                  <Ionicons name="add" size={16} color="#ff3e00" />
                  <Text
                    variant="caption"
                    color="ember"
                    className="font-semibold text-xs"
                  >
                    Add Owner
                  </Text>
                </TouchableOpacity>
              </View>

              {fields.map((field, index) => (
                <View
                  key={field.id}
                  className="p-3 bg-surface-recessed border border-stone-border rounded-xl gap-2.5 relative"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      variant="caption"
                      color="ash"
                      className="font-semibold uppercase tracking-wider text-xs"
                    >
                      Co-Owner #{index + 1}
                    </Text>
                    <TouchableOpacity
                      onPress={() => remove(index)}
                      className="p-1"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#ff3e00"
                      />
                    </TouchableOpacity>
                  </View>
                  <FormInputController
                    name={`additionalOwners.${index}.name` as const}
                    control={control}
                    label="Name"
                    placeholder="Full name"
                  />
                  <FormInputController
                    name={`additionalOwners.${index}.phone` as const}
                    control={control}
                    label="Phone"
                    placeholder="10-digit phone"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              ))}
            </View>

            {/* Address & Location Picker */}
            <View className="gap-2 pt-2 border-t border-stone-border">
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <FormInputController
                    name="address"
                    control={control}
                    label="Full Street Address"
                    multiline
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setIsMapModalOpen(true)}
                  className="mt-6 p-3 bg-surface border border-stone-border rounded-xl active:bg-surface-recessed"
                >
                  <Ionicons name="map-outline" size={22} color="#ff3e00" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsMapModalOpen(true)}
                className="flex-row items-center justify-center gap-2 bg-surface-recessed border border-stone-border py-2.5 rounded-xl active:opacity-90 mt-1"
              >
                <Ionicons name="expand" size={16} color="#ff3e00" />
                <Text
                  variant="caption"
                  color="ember"
                  className="font-semibold text-xs"
                >
                  Pick Location on Full Map
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <Button
              variant="primary"
              className="mt-6 py-3.5 rounded-xl"
              onPress={() => {
                handleSubmit(async (data) => {
                  await onSave(data);
                })();
              }}
              loading={isSaving}
            >
              Save Outlet Changes
            </Button>

            <TouchableOpacity
              onPress={handleDelete}
              className="items-center py-3.5 mt-2 bg-surface border border-ember-orange/40 rounded-xl active:opacity-60"
            >
              <Text
                variant="label-medium"
                color="ember"
                className="font-semibold"
              >
                Delete Store Outlet
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <LocationPickerModal
        visible={isMapModalOpen}
        initialLat={watchedLat || 19.076}
        initialLng={watchedLng || 72.8777}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={handleConfirmLocationFromModal}
      />
    </FormProvider>
  );
}

// ---------------------------------------------------------------------------
// Main Screen Component
// ---------------------------------------------------------------------------

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: shop, isLoading, isError, refetch } = useShop(id);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const submitFormRef = useRef<(() => Promise<boolean>) | null>(null);

  const enterEditMode = useCallback(() => {
    if (!shop) return;
    setEditKey((k) => k + 1);
    setHasChanges(false);
    setIsEditing(true);
  }, [shop]);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (submitFormRef.current) {
      return submitFormRef.current();
    }
    return false;
  }, []);

  const handleDiscard = useCallback(() => {
    setIsEditing(false);
    setHasChanges(false);
  }, []);

  const { ConfirmationModal, handleBackPress } = useEditGuard({
    isEditing,
    hasChanges,
    onSave: saveChanges,
    onDiscard: handleDiscard,
    navigation,
  });

  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleShare = useCallback(async () => {
    if (!shop) return;
    try {
      await Share.share({
        message: `${shop.name}\nOwner: ${shop.ownerName || "N/A"}\nPhone: ${shop.phone}\nAddress: ${shop.address || "N/A"}`,
      });
    } catch {
      // cancelled
    }
  }, [shop]);

  const handleCallOwner = useCallback(() => {
    if (shop?.phone) {
      Linking.openURL(`tel:${shop.phone.replace(/[^0-9+]/g, "")}`);
    }
  }, [shop]);

  const handleWhatsApp = useCallback(() => {
    if (shop?.phone) {
      const cleanPhone = shop.phone.replace(/[^0-9]/g, "");
      Linking.openURL(
        `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`}`,
      );
    }
  }, [shop]);

  const handleGetDirections = useCallback(() => {
    if (shop?.latitude && shop?.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`,
      );
    } else if (shop?.address) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`,
      );
    }
  }, [shop]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
          className="ml-2 p-1"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="#343433" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View className="flex-row items-center gap-3 mr-2">
          {isAdmin && !isEditing && (
            <TouchableOpacity
              onPress={enterEditMode}
              className="p-1"
              accessibilityLabel="Edit shop details"
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color="#343433" />
            </TouchableOpacity>
          )}
          {!isEditing && (
            <TouchableOpacity
              onPress={handleShare}
              className="p-1"
              accessibilityLabel="Share shop details"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={22} color="#343433" />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [
    navigation,
    handleShare,
    isAdmin,
    isEditing,
    enterEditMode,
    handleBackPress,
  ]);

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !shop) return <ErrorState onRetry={refetch} />;

  let parsedCoOwners: Array<{ name: string; phone: string }> = [];
  try {
    if (shop.additionalOwners) {
      parsedCoOwners = JSON.parse(shop.additionalOwners);
    }
  } catch {
    parsedCoOwners = [];
  }

  const shopLat = shop.latitude ? Number(shop.latitude) : 19.076;
  const shopLng = shop.longitude ? Number(shop.longitude) : 72.8777;

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: isEditing ? "Edit Shop" : shop.name }} />

      {isEditing ? (
        <EditShopForm
          key={editKey}
          shop={shop}
          insets={insets}
          queryClient={queryClient}
          setIsEditing={setIsEditing}
          setHasChanges={setHasChanges}
          submitFormRef={submitFormRef}
          handleDelete={handleDelete}
        />
      ) : (
        <>
          <ScrollView className="flex-1">
            <View
              className="gap-6 px-4 pt-4"
              style={{ paddingBottom: insets.bottom + 120 }}
            >
              {/* Cover Banner / Image */}
              <View className="w-full h-56 rounded-2xl overflow-hidden bg-surface-recessed border border-stone-border relative">
                {shop.imageUrl ? (
                  <Image
                    source={{ uri: shop.imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                    accessibilityLabel={`${shop.name} photo`}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-surface-recessed">
                    <Ionicons
                      name="storefront-outline"
                      size={56}
                      color="#848281"
                    />
                    <Text
                      variant="caption"
                      color="ash"
                      className="mt-2 font-medium"
                    >
                      Storefront Photo Unset
                    </Text>
                  </View>
                )}

                <View className="absolute top-3 right-3 z-10">
                  <ShopStatusBadge status={shop.status} />
                </View>
              </View>

              {/* Title & Primary Actions */}
              <View className="gap-4">
                <View className="gap-1">
                  <Text
                    variant="heading"
                    color="charcoal"
                    className="text-2xl font-bold"
                  >
                    {shop.name}
                  </Text>
                  <Text variant="caption" color="ash" className="text-xs">
                    Registered ID: {shop.id.slice(0, 8)} • Tenant Scoped
                  </Text>
                </View>

                {/* Contact & Navigation Action Row */}
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={handleCallOwner}
                    className="flex-1 flex-row items-center justify-center gap-1.5 bg-primary py-3 rounded-xl active:opacity-90 shadow-sm"
                  >
                    <Ionicons name="call" size={16} color="#ffffff" />
                    <Text
                      variant="caption"
                      className="font-semibold text-white text-xs"
                    >
                      Call Owner
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleWhatsApp}
                    className="flex-1 flex-row items-center justify-center gap-1.5 bg-emerald-600 py-3 rounded-xl active:opacity-90 shadow-sm"
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                    <Text
                      variant="caption"
                      className="font-semibold text-white text-xs"
                    >
                      WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleGetDirections}
                    className="flex-1 flex-row items-center justify-center gap-1.5 bg-midnight py-3 rounded-xl active:opacity-90 shadow-sm"
                  >
                    <Ionicons name="navigate" size={16} color="#ffffff" />
                    <Text
                      variant="caption"
                      className="font-semibold text-white text-xs"
                    >
                      Directions
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Owners Overview Card */}
              <Card className="p-4 gap-3 bg-surface border-stone-border rounded-2xl shadow-sm">
                <View className="flex-row items-center gap-2 border-b border-stone-border/50 pb-2.5">
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color="#ff3e00"
                  />
                  <Text
                    variant="label-medium"
                    color="charcoal"
                    className="font-bold text-sm"
                  >
                    Owner Details
                  </Text>
                </View>

                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text variant="caption" color="ash">
                      Primary Owner:
                    </Text>
                    <Text
                      variant="label-medium"
                      color="charcoal"
                      className="font-semibold"
                    >
                      {shop.ownerName || "Not specified"}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text variant="caption" color="ash">
                      Primary Phone:
                    </Text>
                    <Text
                      variant="label-medium"
                      color="charcoal"
                      className="font-semibold"
                    >
                      {shop.phone}
                    </Text>
                  </View>
                </View>

                {/* Additional Co-Owners Pill Tags */}
                {parsedCoOwners.length > 0 && (
                  <View className="pt-2 border-t border-stone-border/40 gap-1.5">
                    <Text
                      variant="caption"
                      color="ash"
                      className="text-xs font-semibold"
                    >
                      Co-Owners ({parsedCoOwners.length}):
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {parsedCoOwners.map((owner, idx) => (
                        <View
                          key={idx}
                          className="bg-surface-recessed px-3 py-1.5 rounded-lg border border-stone-border flex-row items-center gap-1.5"
                        >
                          <Ionicons name="person" size={12} color="#848281" />
                          <Text
                            variant="caption"
                            color="charcoal"
                            className="font-medium text-xs"
                          >
                            {owner.name || "Co-Owner"} (
                            {owner.phone || "No phone"})
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </Card>

              {/* Location Card & Interactive Map Canvas */}
              <Card className="p-4 gap-3 bg-surface border-stone-border rounded-2xl shadow-sm">
                <View className="flex-row items-center justify-between border-b border-stone-border/50 pb-2.5">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location-sharp" size={20} color="#ff3e00" />
                    <Text
                      variant="label-medium"
                      color="charcoal"
                      className="font-bold text-sm"
                    >
                      Store Location & Address
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleGetDirections}
                    className="flex-row items-center gap-1"
                  >
                    <Ionicons name="open-outline" size={14} color="#ff3e00" />
                    <Text
                      variant="caption"
                      color="ember"
                      className="font-semibold text-xs"
                    >
                      Maps
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text variant="body" color="graphite" className="leading-5">
                  {shop.address || "Address unassigned"}
                </Text>

                <View className="h-44 w-full rounded-xl overflow-hidden border border-stone-border bg-surface-recessed relative">
                  <ShopMapCanvas
                    shops={[shop]}
                    defaultCenterLat={shopLat}
                    defaultCenterLng={shopLng}
                    selectedShopId={shop.id}
                    onSelectShopFromMap={() => {}}
                  />
                </View>
              </Card>

              {/* Orders Quick Launcher */}
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(admin)/orders/new?shopId=${shop.id}`)
                }
                className="p-4 bg-primary/10 border border-primary/30 rounded-2xl flex-row items-center justify-between active:opacity-90"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
                    <Ionicons name="bag-handle" size={20} color="#ffffff" />
                  </View>
                  <View>
                    <Text
                      variant="label-medium"
                      color="charcoal"
                      className="font-bold"
                    >
                      Create Order for Outlet
                    </Text>
                    <Text variant="caption" color="ash" className="text-xs">
                      Tap to select items & generate invoice
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ff3e00" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      )}

      {/* Edit Guard Modal */}
      {ConfirmationModal}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-midnight/50 items-center justify-center px-4">
          <View className="bg-surface border border-stone-border rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl">
            <View className="w-12 h-12 rounded-full bg-ember-orange/10 items-center justify-center self-center">
              <Ionicons name="trash" size={24} color="#ff3e00" />
            </View>

            <Text
              variant="heading-sm"
              color="charcoal"
              className="text-center font-bold text-lg"
            >
              Delete Store Outlet
            </Text>

            <Text
              variant="body"
              color="graphite"
              className="text-center text-sm leading-5"
            >
              Are you sure you want to delete "{shop?.name}"? This action cannot
              be undone.
            </Text>

            <View className="gap-2.5 mt-2">
              <Button
                variant="primary"
                className="bg-ember-orange active:bg-ember-orange/80 py-3 rounded-xl"
                loading={isDeleting}
                disabled={isDeleting}
                onPress={async () => {
                  if (!shop) return;
                  setIsDeleting(true);
                  try {
                    await apiClient(`/api/shops/${shop.id}`, {
                      method: "DELETE",
                    });
                    queryClient.invalidateQueries({ queryKey: ["shops"] });
                    setShowDeleteModal(false);
                    router.replace("/(admin)/shops");
                  } catch (err) {
                    setShowDeleteModal(false);
                    Alert.alert(
                      "Cannot Delete Store",
                      err instanceof Error
                        ? err.message
                        : "Failed to delete shop",
                    );
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                Delete Outlet
              </Button>

              <Button
                variant="secondary"
                className="py-3 rounded-xl"
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
