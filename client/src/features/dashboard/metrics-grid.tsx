import { View } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { useDashboardMetrics } from "../../hooks/queries/useDashboardMetrics";

function MetricCard({ label, value, change }: { label: string; value: string; change: number }) {
  const isUp = change >= 0;
  return (
    <Card style={{ flex: 1, minWidth: "45%", gap: 4 }}>
      <Text variant="caption" color="ash">{label}</Text>
      <Text variant="heading" color="charcoal">{value}</Text>
      <Text variant="caption" color={isUp ? undefined : "ember"}>
        {isUp ? "+" : ""}{change}%
      </Text>
    </Card>
  );
}

export function MetricsGrid() {
  const { data } = useDashboardMetrics();

  if (!data) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
      <MetricCard label="Revenue" value={`Rs. ${(Number(data.totalRevenue) / 100000).toFixed(1)}L`} change={data.revenueChange} />
      <MetricCard label="Orders" value={String(data.totalOrders)} change={data.ordersChange} />
      <MetricCard label="Visits" value={String(data.totalVisits)} change={data.visitsChange} />
      <MetricCard label="Active Salesmen" value={String(data.activeSalesmen)} change={0} />
    </View>
  );
}
