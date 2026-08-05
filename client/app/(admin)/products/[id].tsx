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
  TextInput,
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
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { Card } from "../../../src/components/ui/card";
import {
  FormInputController,
  FormSelectController,
  ImageUploader,
} from "../../../src/components/shared";
import { useProduct } from "../../../src/hooks/queries/useProduct";
import { StockBadge, ProductSpecsTable } from "../../../src/features/products";
import { useAuthStore } from "../../../src/stores/authStore";
import { apiClient } from "../../../src/lib/apiClient";
import {
  productEditSchema,
  type ProductEditFormValues,
} from "../../../src/lib/validation";
import { useEditGuard } from "../../../src/hooks/useEditGuard";
import { formatCurrency } from "../../../src/lib/format";

const UNIT_OPTIONS = [
  { label: "kg", value: "kg" },
  { label: "g", value: "g" },
  { label: "L", value: "L" },
  { label: "pack", value: "pack" },
  { label: "piece", value: "piece" },
];

function LoadingSkeleton() {
  return (
    <View className="flex-1 bg-canvas">
      <ScrollView>
        <View className="gap-6 px-4 pt-4" style={{ paddingBottom: 120 }}>
          <View className="w-full h-64 bg-stone-border rounded-xl" />
          <View className="gap-4">
            <View className="bg-stone-border rounded w-[40%] h-5" />
            <View className="bg-stone-border rounded w-[75%] h-7" />
            <View className="bg-stone-border rounded w-[35%] h-8" />
            <View className="bg-stone-border rounded w-full h-4 mt-2" />
            <View className="bg-stone-border rounded w-full h-4" />
            <View className="bg-stone-border rounded w-[60%] h-4" />
            <View className="bg-stone-border rounded w-full h-32" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 bg-canvas items-center justify-center px-4">
      <Card className="items-center gap-3 border-ember-orange bg-surface-recessed">
        <Ionicons name="alert-circle-outline" size={24} color="#ff3e00" />
        <Text variant="body" color="ember" className="text-center">
          Failed to load product details.
        </Text>
        <Button variant="secondary" onPress={onRetry}>
          Retry
        </Button>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Edit form (rendered when isEditing is true; uses react-hook-form)
// ---------------------------------------------------------------------------

interface EditFormProps {
  product: NonNullable<ReturnType<typeof useProduct>["data"]>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  queryClient: ReturnType<typeof useQueryClient>;
  setIsEditing: (v: boolean) => void;
  setHasChanges: (v: boolean) => void;
  submitFormRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
  handleDelete: () => void;
}

function EditForm({
  product,
  insets,
  queryClient,
  setIsEditing,
  setHasChanges,
  submitFormRef,
  handleDelete,
}: EditFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const defaultValues: ProductEditFormValues = {
    name: product.name,
    description: product.description ?? "",
    price: parseFloat(product.price),
    stockQuantity: product.stockQuantity,
    category: product.category ?? "",
    unit: product.unit ?? "",
    imageUri: product.imageUrl ?? null,
  };

  const methods = useForm({
    resolver: zodResolver(productEditSchema),
    defaultValues,
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = methods;

  // Propagate dirty state to parent for edit guard
  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty, setHasChanges]);

  // ----- Save handler -----
  const onSave = useCallback(
    async (data: ProductEditFormValues): Promise<boolean> => {
      setIsSaving(true);
      try {
        await apiClient(`/api/products/${product.id}`, {
          method: "PATCH",
          body: {
            name: data.name.trim(),
            description: data.description?.trim() || null,
            price: data.price,
            stockQuantity: data.stockQuantity,
            category: data.category?.trim() || null,
            unit: data.unit || null,
            imageUrl: data.imageUri || null,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["products", product.id] });
        setIsEditing(false);
        setHasChanges(false);
        return true;
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to save changes",
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [product, queryClient, setIsEditing, setHasChanges],
  );

  // Expose a submit function to the parent via ref (for edit guard modal)
  useEffect(() => {
    submitFormRef.current = async () => {
      // Call handleSubmit which triggers validation + onSave if valid
      let success = false;
      await handleSubmit(
        async (data) => {
          success = await onSave(data);
        },
        () => {
          // validation failed — success stays false
        },
      )();
      return success;
    };

    return () => {
      submitFormRef.current = null;
    };
  }, [handleSubmit, onSave, submitFormRef]);

  return (
    <FormProvider {...methods}>
      <ScrollView className="flex-1">
        <View
          className="gap-6 px-4 pt-4"
          style={{ paddingBottom: insets.bottom + 120 }}
        >
          {/* ---- Image ---- */}
          <Controller
            name="imageUri"
            control={control}
            render={({ field: { onChange, value } }) => (
              <ImageUploader
                imageUri={value ?? null}
                onImageSelected={onChange}
                onImageRemoved={() => onChange(null)}
              />
            )}
          />

          {/* ---- Editable fields ---- */}
          <View className="gap-4">
            <FormInputController
              name="name"
              control={control}
              label="Product Name"
              required
            />

            <FormInputController
              name="description"
              control={control}
              label="Description"
              multiline
            />

            {/* Price (numeric) */}
            <Controller
              name="price"
              control={control}
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }) => {
                const displayValue = value != null ? String(value) : "";
                return (
                  <View className="gap-1.5">
                    <View className="flex-row items-center gap-0.5">
                      <Text variant="label-medium" color="charcoal">
                        Price (₹)
                      </Text>
                      <Text variant="caption" color="ember" className="ml-0.5">
                        *
                      </Text>
                    </View>
                    <View
                      className={`flex-row items-center bg-surface border rounded-lg h-11 px-3 ${
                        error ? "border-ember-orange" : "border-stone-border"
                      }`}
                    >
                      <TextInput
                        className="flex-1 font-body text-[15px] text-charcoal p-0"
                        placeholder="0.00"
                        placeholderTextColor="#848281"
                        value={displayValue}
                        onChangeText={(text) => {
                          const filtered = text
                            .replace(/[^0-9.]/g, "")
                            .replace(/(\..*)\./g, "$1");
                          const num = parseFloat(filtered);
                          onChange(isNaN(num) ? undefined : num);
                        }}
                        onBlur={onBlur}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {error && (
                      <Text variant="caption" color="ember">
                        {error.message}
                      </Text>
                    )}
                  </View>
                );
              }}
            />

            {/* Stock Quantity (numeric) */}
            <Controller
              name="stockQuantity"
              control={control}
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }) => {
                const displayValue = value != null ? String(value) : "";
                return (
                  <View className="gap-1.5">
                    <Text variant="label-medium" color="charcoal">
                      Stock Quantity
                    </Text>
                    <View
                      className={`flex-row items-center bg-surface border rounded-lg h-11 px-3 ${
                        error ? "border-ember-orange" : "border-stone-border"
                      }`}
                    >
                      <TextInput
                        className="flex-1 font-body text-[15px] text-charcoal p-0"
                        placeholder="0"
                        placeholderTextColor="#848281"
                        value={displayValue}
                        onChangeText={(text) => {
                          const filtered = text.replace(/[^0-9]/g, "");
                          const num = parseInt(filtered, 10);
                          onChange(isNaN(num) ? 0 : num);
                        }}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                      />
                    </View>
                    {error && (
                      <Text variant="caption" color="ember">
                        {error.message}
                      </Text>
                    )}
                  </View>
                );
              }}
            />

            <FormInputController
              name="category"
              control={control}
              label="Category"
            />

            <FormSelectController
              name="unit"
              control={control}
              label="Unit"
              options={UNIT_OPTIONS}
              placeholder="Select unit"
            />

            <Button
              variant="primary"
              className="mt-6"
              onPress={() => {
                handleSubmit(async (data) => {
                  await onSave(data);
                })();
              }}
              loading={isSaving}
            >
              Save Changes
            </Button>
            <TouchableOpacity
              onPress={handleDelete}
              className="items-center py-3.5 mt-2.5 bg-surface border border-stone-border rounded-lg active:opacity-60"
              accessibilityLabel="Delete product"
              accessibilityRole="button"
            >
              <Text variant="label-medium" color="ember">
                Delete Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </FormProvider>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(0); // forces EditForm remount
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Ref to trigger form submission from the edit guard modal
  const submitFormRef = useRef<(() => Promise<boolean>) | null>(null);

  // ----- Enter edit mode -----
  const enterEditMode = useCallback(() => {
    if (!product) return;
    setEditKey((k) => k + 1);
    setHasChanges(false);
    setIsEditing(true);
  }, [product]);

  // ----- Save handler (called by useEditGuard confirmation modal) -----
  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (submitFormRef.current) {
      return submitFormRef.current();
    }
    return false;
  }, []);

  // ----- Discard handler -----
  const handleDiscard = useCallback(() => {
    setIsEditing(false);
    setHasChanges(false);
  }, []);

  // ----- Edit guard -----
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
    if (!product) return;
    try {
      await Share.share({
        message: `${product.name} - ${formatCurrency(product.price)}\nSKU: ${product.sku || "N/A"}`,
      });
    } catch {
      /* cancelled */
    }
  }, [product]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
          className="ml-2"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="#343433" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View className="flex-row items-center gap-2 mr-2">
          {isAdmin && !isEditing && (
            <TouchableOpacity
              onPress={enterEditMode}
              accessibilityLabel="Edit product"
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color="#343433" />
            </TouchableOpacity>
          )}
          {!isEditing && (
            <TouchableOpacity
              onPress={handleShare}
              accessibilityLabel="Share product"
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
  if (isError || !product) return <ErrorState onRetry={refetch} />;

  const specs = [{ label: "Category", value: product.category }];

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen
        options={{ title: isEditing ? "Edit Product" : product.name }}
      />

      {isEditing ? (
        <EditForm
          key={editKey}
          product={product}
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
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  className="w-full h-64 rounded-xl bg-surface-recessed"
                  resizeMode="cover"
                  accessibilityLabel={`${product.name} image`}
                />
              ) : (
                <View className="w-full h-64 rounded-xl bg-surface-recessed items-center justify-center">
                  <Ionicons name="cube-outline" size={56} color="#848281" />
                </View>
              )}

              <View className="flex-row items-center justify-between">
                <StockBadge status={product.stockStatus} />
                {product.sku && (
                  <Text variant="caption" color="ash">
                    SKU: {product.sku}
                  </Text>
                )}
              </View>

              <View className="gap-1.5">
                <Text variant="heading" color="charcoal">
                  {product.name}
                </Text>
                <Text variant="display" color="midnight">
                  {formatCurrency(product.price)}
                </Text>
                <Text variant="body" color="ash">
                  {product.stockQuantity} units in stock
                </Text>
              </View>

              {product.description && (
                <View className="gap-2">
                  <Text variant="heading-sm" color="charcoal">
                    Overview
                  </Text>
                  <Text variant="body" color="graphite" className="leading-6">
                    {product.description}
                  </Text>
                </View>
              )}

              <View className="gap-2">
                <Text variant="heading-sm" color="charcoal">
                  Specifications
                </Text>
                <ProductSpecsTable specs={specs} />
              </View>
            </View>
          </ScrollView>

          <View
            className="border-t border-stone-border bg-surface px-4 py-3"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <View className="flex-row gap-3">
              <Button variant="secondary" className="flex-1">
                Check Availability
              </Button>
              <Button variant="primary" className="flex-1">
                Add to Order
              </Button>
            </View>
          </View>
        </>
      )}

      {/* ---- Edit guard confirmation modal ---- */}
      {ConfirmationModal}

      {/* ---- Custom Delete Product Confirm Modal ---- */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-midnight/40 items-center justify-center px-4">
          <View className="bg-canvas border border-stone-border rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl">
            <Text
              variant="heading-sm"
              color="charcoal"
              className="text-center mt-1"
            >
              Delete Product
            </Text>
            <Text
              variant="body"
              color="graphite"
              className="text-center leading-5 mb-2"
            >
              Are you sure you want to delete "{product?.name}"? This cannot be
              undone.
            </Text>

            <View className="gap-3">
              <Button
                variant="primary"
                className="bg-ember-orange active:bg-ember-orange/80"
                onPress={async () => {
                  if (!product) return;
                  try {
                    await apiClient(`/api/products/${product.id}`, {
                      method: "DELETE",
                    });
                    queryClient.invalidateQueries({ queryKey: ["products"] });
                    setShowDeleteModal(false);
                    router.replace("/(admin)/products");
                  } catch (err) {
                    setShowDeleteModal(false);
                    Alert.alert(
                      "Error",
                      err instanceof Error
                        ? err.message
                        : "Failed to delete product",
                    );
                  }
                }}
              >
                Delete Product
              </Button>
              <Button
                variant="secondary"
                onPress={() => setShowDeleteModal(false)}
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
