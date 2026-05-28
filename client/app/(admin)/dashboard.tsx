import { View, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../src/components/ui/text";
import { MetricsGrid } from "../../src/features/dashboard/metrics-grid";
import { RecentVisitsList } from "../../src/features/dashboard/recent-visits-list";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas">

      {/* Main Contents */}
      <ScrollView>
        <View
          className="flex-1 gap-6 pt-4"
          style={{ paddingBottom: insets.bottom + 80 }}
        >
          <View className="px-4">
            <Text variant="heading-sm" color="charcoal">Overview</Text>
          </View>
          <MetricsGrid />
          <RecentVisitsList />
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        className="absolute right-4 flex-row items-center bg-midnight rounded-full py-3.5 px-[22px] z-50"
        style={{
          bottom: insets.bottom + 80,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 8,
          elevation: 6,
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#ffffff" className="mr-1.5" />
        <Text variant="label-medium" color="surface">
          New Order
        </Text>
      </TouchableOpacity>
    </View>
  );
}
