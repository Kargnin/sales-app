import { View, FlatList } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { MOCK_RECENT_ORDERS } from "../../lib/mockData";
import tailwindConfig from "../../../tailwind.config";

const colors = tailwindConfig.theme.extend.colors;

const statusBgColors: Record<string, string> = {
  pending_approval: colors.warning + "20",
  confirmed: colors.info + "20",
  dispatched: colors.success + "20",
  delivered: colors.success + "20",
  cancelled: colors["ember-orange"] + "20",
};

const statusTextColors: Record<string, string> = {
  pending_approval: colors.warning,
  confirmed: colors.info,
  dispatched: colors.success,
  delivered: colors.success,
  cancelled: colors["ember-orange"],
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
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text variant="label-medium" color="charcoal">Rs. {item.totalAmount}</Text>
                <View style={{
                  backgroundColor: statusBgColors[item.status] || colors["stone-border"],
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                }}>
                  <Text variant="caption" style={{ color: statusTextColors[item.status] || colors.ash }}>
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
