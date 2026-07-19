import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { View, ScrollView, Image, Share, TouchableOpacity, Alert, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useNavigation, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { Card } from "../../../src/components/ui/card";
import { FormInput, FormSelect, ImageUploader } from "../../../src/components/shared";
import { useProduct } from "../../../src/hooks/queries/useProduct";
import { StockBadge, ProductSpecsTable } from "../../../src/features/products";
import { useAuthStore } from "../../../src/stores/authStore";
import { apiClient } from "../../../src/lib/apiClient";

const UNIT_OPTIONS = [
  { label: "kg", value: "kg" },
  { label: "g", value: "g" },
  { label: "L", value: "L" },
  { label: "pack", value: "pack" },
  { label: "piece", value: "piece" },
];

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
}

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

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalOnDiscard, setConfirmModalOnDiscard] = useState<(() => void) | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ----- Enter edit mode -----
  const enterEditMode = useCallback(() => {
    if (!product) return;
    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditPrice(product.price);
    setEditStock(String(product.stockQuantity));
    setEditCategory(product.category ?? "");
    setEditUnit(product.unit ?? "");
    setEditImageUri(product.imageUrl);
    setErrors({});
    setIsEditing(true);
  }, [product]);

  // ----- Form Validation -----
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!editName.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!editPrice.trim()) {
      newErrors.price = "Price is required";
    } else {
      const priceNum = Number(editPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        newErrors.price = "Price must be a positive number";
      }
    }

    if (editStock.trim()) {
      const stockNum = Number(editStock);
      if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
        newErrors.stock = "Stock must be a non-negative integer";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [editName, editPrice, editStock]);

  // ----- Dirty check -----
  const hasChanges = useMemo(() => {
    if (!product) return false;
    return (
      editName !== product.name ||
      editDescription !== (product.description ?? "") ||
      editPrice !== product.price ||
      editStock !== String(product.stockQuantity) ||
      editCategory !== (product.category ?? "") ||
      editUnit !== (product.unit ?? "") ||
      editImageUri !== product.imageUrl
    );
  }, [product, editName, editDescription, editPrice, editStock, editCategory, editUnit, editImageUri]);

  // ----- Save changes -----
  const saveChanges = useCallback(async (actionToDispatch?: any) => {
    if (!product) return false;
    if (!validateForm()) return false;

    setIsSaving(true);
    try {
      await apiClient(`/api/products/${product.id}`, {
        method: "PATCH",
        body: {
          name: editName.trim(),
          description: editDescription.trim() || null,
          price: Number(editPrice),
          stockQuantity: Number(editStock),
          category: editCategory.trim() || null,
          unit: editUnit || null,
          imageUrl: editImageUri || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", product.id] });
      setIsEditing(false);
      setErrors({});
      if (actionToDispatch) {
        navigation.dispatch(actionToDispatch);
      }
      return true;
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save changes");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    product,
    editName,
    editDescription,
    editPrice,
    editStock,
    editCategory,
    editUnit,
    editImageUri,
    queryClient,
    validateForm,
    navigation,
  ]);

  // ----- Custom Dialog Prompts (Coherent with App Design) -----
  const promptUnsavedChanges = useCallback((onDiscard: () => void, onSave: () => void) => {
    setConfirmModalOnDiscard(() => onDiscard);
    setShowConfirmModal(true);
  }, []);

  const handleModalDiscard = useCallback(() => {
    setShowConfirmModal(false);
    if (confirmModalOnDiscard) {
      confirmModalOnDiscard();
    }
  }, [confirmModalOnDiscard]);

  const handleModalKeepEditing = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const handleModalSave = useCallback(async () => {
    const success = await saveChanges();
    if (success) {
      setShowConfirmModal(false);
      if (confirmModalOnDiscard) {
        confirmModalOnDiscard();
      }
    }
  }, [saveChanges, confirmModalOnDiscard]);

  // ----- Cancel changes -----
  const handleCancel = useCallback(() => {
    if (!hasChanges) {
      setIsEditing(false);
      setErrors({});
      return;
    }
    promptUnsavedChanges(
      () => {
        setIsEditing(false);
        setErrors({});
      },
      () => saveChanges()
    );
  }, [hasChanges, saveChanges, promptUnsavedChanges]);

  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `${product.name} - ${formatCurrency(product.price)}\nSKU: ${product.sku || "N/A"}`,
      });
    } catch { /* cancelled */ }
  }, [product]);

  // ----- Navigation Interceptor Guard -----
  useEffect(() => {
    if (!isEditing) return;

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Always prevent the default navigation (going back to the catalog) when in edit mode.
      // Instead, we exit edit mode and stay on the current product detail page.
      e.preventDefault();

      if (!hasChanges) {
        setIsEditing(false);
        setErrors({});
        return;
      }

      promptUnsavedChanges(
        () => {
          setIsEditing(false);
          setErrors({});
        },
        () => saveChanges()
      );
    });

    return unsubscribe;
  }, [isEditing, hasChanges, saveChanges, navigation, promptUnsavedChanges]);

  useLayoutEffect(() => {
    const handleBackPress = () => {
      if (isEditing) {
        handleCancel();
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        router.replace("/(admin)/products");
      }
    };

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
  }, [navigation, handleShare, isAdmin, isEditing, enterEditMode, handleCancel]);

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !product) return <ErrorState onRetry={refetch} />;

  const specs = [
    { label: "Category", value: product.category },
    { label: "Weight", value: product.weight },
    { label: "Dimensions", value: product.dimensions },
    { label: "Material", value: product.material },
  ];

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: isEditing ? "Edit Product" : product.name }} />

      <ScrollView className="flex-1">
        <View className="gap-6 px-4 pt-4" style={{ paddingBottom: insets.bottom + 120 }}>
          {/* ---- Image ---- */}
          {isEditing ? (
            <ImageUploader
              imageUri={editImageUri}
              onImageSelected={setEditImageUri}
              onImageRemoved={() => setEditImageUri(null)}
            />
          ) : product.imageUrl ? (
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

          {/* ---- Stock Badge + SKU ---- */}
          {!isEditing && (
            <View className="flex-row items-center justify-between">
              <StockBadge status={product.stockStatus} />
              {product.sku && (
                <Text variant="caption" color="ash">SKU: {product.sku}</Text>
              )}
            </View>
          )}

          {/* ---- Editable fields ---- */}
          {isEditing ? (
            <View className="gap-4">
              <FormInput
                label="Product Name"
                value={editName}
                onChangeText={(t) => {
                  setEditName(t);
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                error={errors.name}
                required
              />
              <FormInput
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
              />
              <FormInput
                label="Price (₹)"
                value={editPrice}
                onChangeText={(t) => {
                  setEditPrice(t.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
                  setErrors((prev) => ({ ...prev, price: "" }));
                }}
                error={errors.price}
                keyboardType="decimal-pad"
                required
              />
              <FormInput
                label="Stock Quantity"
                value={editStock}
                onChangeText={(t) => {
                  setEditStock(t.replace(/[^0-9]/g, ""));
                  setErrors((prev) => ({ ...prev, stock: "" }));
                }}
                error={errors.stock}
                keyboardType="number-pad"
              />
              <FormInput
                label="Category"
                value={editCategory}
                onChangeText={setEditCategory}
              />
              <FormSelect
                label="Unit"
                value={editUnit}
                onChange={setEditUnit}
                options={UNIT_OPTIONS}
                placeholder="Select unit"
              />
              <Button
                variant="primary"
                className="mt-6"
                onPress={() => saveChanges()}
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
                <Text variant="label-medium" color="ember">Delete Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Name + Price */}
              <View className="gap-1.5">
                <Text variant="heading" color="charcoal">{product.name}</Text>
                <Text variant="display" color="midnight">{formatCurrency(product.price)}</Text>
                <Text variant="body" color="ash">{product.stockQuantity} units in stock</Text>
              </View>

              {/* Description */}
              {product.description && (
                <View className="gap-2">
                  <Text variant="heading-sm" color="charcoal">Overview</Text>
                  <Text variant="body" color="graphite" className="leading-6">{product.description}</Text>
                </View>
              )}

              {/* Specifications */}
              <View className="gap-2">
                <Text variant="heading-sm" color="charcoal">Specifications</Text>
                <ProductSpecsTable specs={specs} />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ---- Bottom Bar ---- */}
      {!isEditing && (
        <View className="border-t border-stone-border bg-surface px-4 py-3" style={{ paddingBottom: insets.bottom + 8 }}>
          <View className="flex-row gap-3">
            <Button variant="secondary" className="flex-1">Check Availability</Button>
            <Button variant="primary" className="flex-1">Add to Order</Button>
          </View>
        </View>
      )}

      {/* ---- Custom Unsaved Changes Confirm Modal ---- */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalKeepEditing}
      >
        <View className="flex-1 bg-midnight/40 items-center justify-center px-4">
          <View className="bg-canvas border border-stone-border rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl">
            <Text variant="heading-sm" color="charcoal" className="text-center mt-1">
              Unsaved Changes
            </Text>
            <Text variant="body" color="graphite" className="text-center leading-5 mb-2">
              You have unsaved changes. What would you like to do?
            </Text>
            
            <View className="gap-3">
              <Button variant="primary" onPress={handleModalSave} loading={isSaving}>
                Save Changes
              </Button>
              <Button
                variant="secondary"
                className="bg-stone-border/40 active:bg-stone-border/60"
                onPress={handleModalDiscard}
              >
                Discard Changes
              </Button>
              <TouchableOpacity
                onPress={handleModalKeepEditing}
                className="items-center py-2 mt-1"
                accessibilityLabel="Keep editing"
                accessibilityRole="button"
              >
                <Text variant="label-medium" color="ash">
                  Keep Editing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Custom Delete Product Confirm Modal ---- */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-midnight/40 items-center justify-center px-4">
          <View className="bg-canvas border border-stone-border rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl">
            <Text variant="heading-sm" color="charcoal" className="text-center mt-1">
              Delete Product
            </Text>
            <Text variant="body" color="graphite" className="text-center leading-5 mb-2">
              Are you sure you want to delete "{product?.name}"? This cannot be undone.
            </Text>
            
            <View className="gap-3">
              <Button
                variant="primary"
                className="bg-ember-orange active:bg-ember-orange/80"
                onPress={async () => {
                  if (!product) return;
                  try {
                    await apiClient(`/api/products/${product.id}`, { method: "DELETE" });
                    queryClient.invalidateQueries({ queryKey: ["products"] });
                    setShowDeleteModal(false);
                    router.replace("/(admin)/products");
                  } catch (err) {
                    setShowDeleteModal(false);
                    Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete product");
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
