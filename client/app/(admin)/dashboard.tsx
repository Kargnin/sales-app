import { ScrollView, View } from "react-native";
import { Text } from "../../src/components/ui/text";
import { MetricsGrid } from "../../src/features/dashboard/metrics-grid";
import { RecentOrdersList } from "../../src/features/dashboard/recent-orders-list";

export default function DashboardScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fbfaf9" }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ paddingTop: 60, paddingBottom: 32, gap: 32 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Text variant="display" color="charcoal">Dashboard</Text>
            <Text variant="body" color="ash">Overview of your field operations</Text>
          </View>
          <MetricsGrid />
          <RecentOrdersList />
        </View>
      </ScrollView>
    </View>
  );
}
