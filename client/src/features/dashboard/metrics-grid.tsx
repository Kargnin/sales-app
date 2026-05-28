import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { useDashboardMetrics } from "../../hooks/queries/useDashboardMetrics";

const SUCCESS = "#00ca48";
const WARNING = "#ffbb26";
const ASH = "#848281";
const EMBER = "#ff3e00";
const STONE = "#f2f0ed";

function MetricCard({
  label,
  value,
  subtext,
  iconName,
  iconColor,
  textColor = "charcoal",
  trendIcon,
}: {
  label: string;
  value: string;
  subtext: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  textColor?: "charcoal" | "ember" | "graphite";
  trendIcon?: boolean;
}) {
  return (
    <Card className="flex-1 min-w-[46%] max-w-[48%] gap-1.5 rounded-xl">
      <View className="flex-row justify-between items-center">
        <Text variant="caption" color="ash">
          {label}
        </Text>
      </View>
      <Text variant="display" color={textColor}>
        {value}
      </Text>
      <View className="flex-row items-center mt-1">
        {trendIcon ? (
          <Ionicons name="trending-up" size={14} color={SUCCESS} style={{ marginRight: 4 }} />
        ) : (
          <Ionicons name={iconName} size={14} color={iconColor} style={{ marginRight: 4 }} />
        )}
        <Text variant="caption" style={{ color: iconColor }}>
          {subtext}
        </Text>
      </View>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="flex-1 min-w-[46%] max-w-[48%] gap-1.5 opacity-60">
      <View className="bg-stone-border rounded w-[60%] h-3 mb-2" />
      <View className="bg-stone-border rounded w-[80%] h-7 mb-2.5" />
      <View className="bg-stone-border rounded w-[50%] h-3" />
    </Card>
  );
}

export function MetricsGrid() {
  const { data, isLoading, isError } = useDashboardMetrics();

  if (isLoading) {
    return (
      <View className="flex-row flex-wrap gap-3 px-4 justify-between">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="px-4">
        <Card className="flex-row items-center gap-3 border-ember-orange bg-surface-recessed">
          <Ionicons name="alert-circle-outline" size={24} color={EMBER} />
          <Text variant="body" color="ember">
            Failed to load dashboard metrics.
          </Text>
        </Card>
      </View>
    );
  }

  const formatRevenue = (rev: string) => {
    const num = Number(rev);
    if (isNaN(num)) return "₹0.00";
    if (num >= 1000) {
      return `₹${(num / 1000).toFixed(1)}k`;
    }
    return `₹${num.toFixed(2)}`;
  };

  return (
    <View className="flex-row flex-wrap gap-3 px-4 justify-between">
      <MetricCard
        label="Total Sales"
        value={formatRevenue(data.totalRevenue)}
        subtext={`+${data.revenueChange}%`}
        iconName="trending-up"
        iconColor={SUCCESS}
        trendIcon
      />
      <MetricCard
        label="Active Salesmen"
        value={String(data.activeSalesmen)}
        subtext="Online now"
        iconName="people-outline"
        iconColor={SUCCESS}
      />
      <MetricCard
        label="Pending Approvals"
        value={String(data.pendingApprovals)}
        subtext="New shops"
        iconName="storefront-outline"
        iconColor={WARNING}
        textColor="ember"
      />
      <MetricCard
        label="Total Visits"
        value={String(data.totalVisits)}
        subtext="This week"
        iconName="calendar-outline"
        iconColor={ASH}
      />
    </View>
  );
}
