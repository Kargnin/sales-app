import { View, FlatList } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { MOCK_RECENT_ORDERS } from "../../lib/mockData";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_approval: { bg: "#ffbb26", text: "#ffbb26" },
  confirmed:       { bg: "#0090ff", text: "#0090ff" },
  dispatched:      { bg: "#00ca48", text: "#00ca48" },
  delivered:       { bg: "#00ca48", text: "#00ca48" },
  cancelled:       { bg: "#ff3e00", text: "#ff3e00" },
};

export function RecentOrdersList() {
  return (
    <View className="gap-3 px-4">
      <Text variant="heading-sm" color="charcoal">Recent Orders</Text>
      <FlatList
        data={MOCK_RECENT_ORDERS}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          const statusStyle = STATUS_COLORS[item.status] || { bg: "#f2f0ed", text: "#848281" };
          return (
            <Card>
              <View className="flex-row justify-between items-center">
                <View className="flex-1 gap-0.5">
                  <Text variant="label-medium" color="charcoal">{item.shopName}</Text>
                  <Text variant="caption" color="ash">{item.salesmanName}</Text>
                </View>
                <View className="items-end gap-1">
                  <Text variant="label-medium" color="charcoal">Rs. {item.totalAmount}</Text>
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: statusStyle.bg + "20" }}
                  >
                    <Text variant="caption" style={{ color: statusStyle.text }}>
                      {item.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
