import { View, FlatList } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { MOCK_RECENT_ORDERS } from "../../lib/mockData";

const statusColors: Record<string, string> = {
  pending_approval: "#ffbb26",
  confirmed: "#0090ff",
  dispatched: "#00ca48",
  delivered: "#00ca48",
  cancelled: "#ff3e00",
};

export function RecentOrdersList() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      <Text variant="heading-sm" color="charcoal">Recent Orders</Text>
      <FlatList
        data={MOCK_RECENT_ORDERS}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label-medium" color="charcoal">{item.shopName}</Text>
                <Text variant="caption" color="ash">{item.salesmanName}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text variant="label-medium" color="charcoal">Rs. {item.totalAmount}</Text>
                <View style={{
                  backgroundColor: statusColors[item.status] + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                }}>
                  <Text variant="caption">
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
