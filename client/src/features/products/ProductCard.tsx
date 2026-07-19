import { View, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { StockBadge } from "./StockBadge";
import { cn } from "../../lib/utils";
import type { Product } from "../../types";

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
}

function ProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        className="w-full h-32 rounded-lg"
        resizeMode="cover"
        accessibilityLabel={`${name} image`}
      />
    );
  }

  return (
    <View className="w-full h-32 bg-surface-recessed rounded-lg items-center justify-center">
      <Ionicons name="cube-outline" size={32} color="#848281" />
    </View>
  );
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
}

export function ProductCard({ product, onPress, onLongPress, className }: ProductCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityLabel={`View ${product.name} details`}
      accessibilityRole="button"
    >
      <Card className={cn("gap-3", className)}>
        {/* Image with stock badge overlay */}
        <View className="relative">
          <ProductImage imageUrl={product.imageUrl} name={product.name} />
          <View className="absolute top-2 right-2">
            <StockBadge status={product.stockStatus} compact />
          </View>
        </View>

        <View className="gap-1.5">
          {product.sku && (
            <Text variant="caption" color="ash" className="text-[11px]">
              {product.sku}
            </Text>
          )}

          <Text
            variant="body"
            color="charcoal"
            className="font-body-semibold"
            numberOfLines={2}
          >
            {product.name}
          </Text>

          <Text variant="heading-sm" color="midnight">
            {formatCurrency(product.price)}
          </Text>

          <Text variant="caption" color="ash">
            {product.stockQuantity} units
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function AddProductCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[48%]"
      activeOpacity={0.7}
      accessibilityLabel="Add new product"
      accessibilityRole="button"
    >
      <Card className="h-full items-center justify-center gap-3 border-dashed border-stone-border bg-surface-recessed min-h-[220px]">
        <View className="w-12 h-12 rounded-full bg-stone-border items-center justify-center">
          <Ionicons name="add" size={28} color="#848281" />
        </View>
        <Text variant="caption" color="ash" className="text-center">
          Add New Product
        </Text>
      </Card>
    </TouchableOpacity>
  );
}
