import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { useVisits } from "../../hooks/queries/useVisits";
import tailwindConfig from "../../../tailwind.config";

const colors = tailwindConfig.theme.extend.colors;

function getInitials(name?: string) {
  if (!name) return "??";
  const cleanName = name.replace(/_/, " ").trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function formatTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "10:45 AM";
  }
}

export function RecentVisitsList() {
  const { data: visits, isLoading, isError } = useVisits();

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="heading-sm" color="charcoal">Recent Visits</Text>
        </View>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, opacity: 0.6 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors["stone-border"], marginRight: 12 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ backgroundColor: colors["stone-border"], borderRadius: 4, width: "40%", height: 14 }} />
              <View style={{ backgroundColor: colors["stone-border"], borderRadius: 4, width: "60%", height: 12 }} />
            </View>
          </View>
        </Card>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="heading-sm" color="charcoal">Recent Visits</Text>
        </View>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, borderColor: colors["ember-orange"], backgroundColor: colors["surface-recessed"] }}>
          <Ionicons name="alert-circle-outline" size={24} color={colors["ember-orange"]} />
          <Text variant="body" color="ember">Failed to load recent visits.</Text>
        </Card>
      </View>
    );
  }

  const recentVisits = visits?.slice(0, 5) || [];

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="heading-sm" color="charcoal">
          Recent Visits
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text variant="label-medium" color="ash">
            View All
          </Text>
        </TouchableOpacity>
      </View>

      {recentVisits.length === 0 ? (
        <Card style={{ alignItems: "center", justifyContent: "center", paddingVertical: 32 }}>
          <Ionicons name="calendar-outline" size={32} color={colors.ash} style={{ marginBottom: 8 }} />
          <Text variant="body" color="ash">
            No recent visits recorded today.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {recentVisits.map((item, index) => {
            const isLast = index === recentVisits.length - 1;
            const salesmanName = item.salesmanName || "Sales Representative";
            const initials = getInitials(salesmanName);
            const formattedTime = formatTime(item.visitedAt);

            return (
              <View key={item.id}>
                <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
                  {/* Avatar Circle */}
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: colors["stone-border"],
                    backgroundColor: colors["surface-recessed"],
                  }}>
                    <Text variant="label-medium" color="charcoal">
                      {initials}
                    </Text>
                  </View>
 
                  {/* Visit Details */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body" color="charcoal">
                      {salesmanName}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="storefront-outline" size={14} color={colors.ash} style={{ marginRight: 4 }} />
                      <Text variant="caption" color="ash" numberOfLines={1}>
                        {item.shopName}
                      </Text>
                    </View>
                  </View>

                  {/* Status / Time */}
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text variant="label-medium" color="charcoal">
                      Completed
                    </Text>
                    <Text variant="caption" color="ash">
                      {formattedTime}
                    </Text>
                  </View>
                </View>

                {/* Line Separator */}
                {!isLast && <View style={{ height: 1, backgroundColor: colors["stone-border"], marginHorizontal: 16 }} />}
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}
