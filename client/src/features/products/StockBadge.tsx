import { View } from "react-native";
import { Text } from "../../components/ui/text";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

interface StockBadgeProps {
  status: StockStatus;
  compact?: boolean;
}

const CONFIG: Record<
  StockStatus,
  { label: string; bgClass: string; textColor: "midnight" | "warning" | "ember" }
> = {
  in_stock: {
    label: "In Stock",
    bgClass: "bg-surface",
    textColor: "midnight",
  },
  low_stock: {
    label: "Low Stock",
    bgClass: "bg-surface",
    textColor: "warning",
  },
  out_of_stock: {
    label: "Out of Stock",
    bgClass: "bg-surface-recessed",
    textColor: "ember",
  },
};

export function StockBadge({ status }: StockBadgeProps) {
  const config = CONFIG[status];
  const isOutOfStock = status === "out_of_stock";

  return (
    <View
      className={`rounded-full px-2.5 py-0.5 ${config.bgClass}`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isOutOfStock ? 0 : 0.06,
        shadowRadius: 2,
        elevation: isOutOfStock ? 0 : 1,
      }}
    >
      <Text
        variant="caption"
        color={config.textColor}
        className={isOutOfStock ? "" : "font-body-medium text-[11px]"}
      >
        {config.label}
      </Text>
    </View>
  );
}
