import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { useDashboardMetrics } from "../../hooks/queries/useDashboardMetrics";
import tailwindConfig from "../../../tailwind.config";

const colors = tailwindConfig.theme.extend.colors;

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
    <Card style={{ flex: 1, minWidth: "46%", maxWidth: "48%", gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="caption" color="ash">
          {label}
        </Text>
      </View>
      <Text variant="display" color={textColor}>
        {value}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
        {trendIcon ? (
          <Ionicons name="trending-up" size={14} color={colors.success} style={{ marginRight: 4 }} />
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
    <Card style={{ flex: 1, minWidth: "46%", maxWidth: "48%", gap: 6, opacity: 0.6 }}>
      <View style={{ backgroundColor: colors["stone-border"], borderRadius: 4, width: "60%", height: 12, marginBottom: 8 }} />
      <View style={{ backgroundColor: colors["stone-border"], borderRadius: 4, width: "80%", height: 28, marginBottom: 10 }} />
      <View style={{ backgroundColor: colors["stone-border"], borderRadius: 4, width: "50%", height: 12 }} />
    </Card>
  );
}

export function MetricsGrid() {
  const { data, isLoading, isError } = useDashboardMetrics();

  if (isLoading) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, justifyContent: "space-between" }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, borderColor: colors["ember-orange"], backgroundColor: colors["surface-recessed"] }}>
          <Ionicons name="alert-circle-outline" size={24} color={colors["ember-orange"]} />
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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, justifyContent: "space-between" }}>
      <MetricCard
        label="Total Sales"
        value={formatRevenue(data.totalRevenue)}
        subtext={`+${data.revenueChange}%`}
        iconName="trending-up"
        iconColor={colors.success}
        trendIcon={true}
      />
      <MetricCard
        label="Active Salesmen"
        value={String(data.activeSalesmen)}
        subtext="Online now"
        iconName="people-outline"
        iconColor={colors.success}
      />
      <MetricCard
        label="Pending Approvals"
        value={String(data.pendingApprovals)}
        subtext="New shops"
        iconName="storefront-outline"
        iconColor={colors.warning}
        textColor="ember"
      />
      <MetricCard
        label="Total Visits"
        value={String(data.totalVisits)}
        subtext="This week"
        iconName="calendar-outline"
        iconColor={colors.ash}
      />
    </View>
  );
}
