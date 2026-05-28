import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { useVisits } from "../../hooks/queries/useVisits";

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
      <View className="px-4 gap-3">
        <View className="flex-row justify-between items-center">
          <Text variant="heading-sm" color="charcoal">Recent Visits</Text>
        </View>
        <Card className="p-0 overflow-hidden">
          <View className="flex-row items-center p-4 opacity-60">
            <View className="w-10 h-10 rounded-full bg-stone-border mr-3" />
            <View className="flex-1 gap-1.5">
              <View className="bg-stone-border rounded w-[40%] h-3.5" />
              <View className="bg-stone-border rounded w-[60%] h-3" />
            </View>
          </View>
        </Card>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="px-4 gap-3">
        <View className="flex-row justify-between items-center">
          <Text variant="heading-sm" color="charcoal">Recent Visits</Text>
        </View>
        <Card className="flex-row items-center gap-3 border-ember-orange bg-surface-recessed">
          <Ionicons name="alert-circle-outline" size={24} color="#ff3e00" />
          <Text variant="body" color="ember">Failed to load recent visits.</Text>
        </Card>
      </View>
    );
  }

  const recentVisits = visits?.slice(0, 5) || [];

  return (
    <View className="px-4 gap-3">
      <View className="flex-row justify-between items-center">
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
        <Card className="items-center justify-center py-8">
          <Ionicons name="calendar-outline" size={32} color="#848281" className="mb-2" />
          <Text variant="body" color="ash">
            No recent visits recorded today.
          </Text>
        </Card>
      ) : (
        <Card className="py-3 px-4 overflow-hidden rounded-xl gap-2">
          {recentVisits.map((item, index) => {
            const isLast = index === recentVisits.length - 1;
            const salesmanName = item.salesmanName || "Sales Representative";
            const initials = getInitials(salesmanName);
            const formattedTime = formatTime(item.visitedAt);

            return (
              <View key={item.id}>
                <View className="flex-row items-center py-2 px-1">
                  {/* Avatar Circle */}
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-3 border border-stone-border bg-surface-recessed">
                    <Text variant="label-medium" color="charcoal">
                      {initials}
                    </Text>
                  </View>

                  {/* Visit Details */}
                  <View className="flex-1 gap-0.5">
                    <Text variant="body" color="charcoal">
                      {salesmanName}
                    </Text>
                    <View className="flex-row items-center">
                      <Ionicons name="storefront-outline" size={14} color="#848281" style={{ marginRight: 4 }} />
                      <Text variant="caption" color="ash" numberOfLines={1}>
                        {item.shopName}
                      </Text>
                    </View>
                  </View>

                  {/* Status / Time */}
                  <View className="items-end gap-0.5">
                    <Text variant="label-medium" color="charcoal">
                      Completed
                    </Text>
                    <Text variant="caption" color="ash">
                      {formattedTime}
                    </Text>
                  </View>
                </View>

                {!isLast && <View className="h-px bg-stone-border mx-4 mt-1" />}
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}
