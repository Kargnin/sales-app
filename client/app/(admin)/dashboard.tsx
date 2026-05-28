import { useMemo } from "react";
import { ScrollView, View, Image, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../src/components/ui/text";
import { MetricsGrid } from "../../src/features/dashboard/metrics-grid";
import { RecentVisitsList } from "../../src/features/dashboard/recent-visits-list";
import tailwindConfig from "../../tailwind.config";

const mascotPartner = require("../../assets/mascot_partner.png");
const colors = tailwindConfig.theme.extend.colors;

export default function DashboardScreen() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning, Partner";
    if (hour >= 12 && hour < 18) return "Good afternoon, Partner";
    return "Good evening, Partner";
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Top Header Bar */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 54 : 32,
        paddingBottom: 12,
        backgroundColor: colors.canvas,
        borderBottomWidth: 1,
        borderColor: colors["stone-border"],
      }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors["mascot-peach"],
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors["stone-border"],
          }}>
            <Image
              source={mascotPartner}
              style={{ width: "100%", height: "100%", transform: [{ scale: 1.15 }] }}
              resizeMode="cover"
            />
          </View>
          <Text variant="heading" color="charcoal">
            {greeting}
          </Text>
        </View>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors["stone-border"],
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 2,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      {/* Main Contents Scroll */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, marginBottom: -12 }}>
          <Text variant="heading-sm" color="charcoal">Overview</Text>
        </View>
        <MetricsGrid />
        <RecentVisitsList />
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: Platform.OS === "ios" ? 100 : 84,
          right: 16,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.midnight,
          borderRadius: 9999,
          paddingVertical: 14,
          paddingHorizontal: 22,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 8,
          elevation: 6,
          zIndex: 50,
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color={colors.surface} style={{ marginRight: 6 }} />
        <Text variant="label-medium" color="surface">
          New Order
        </Text>
      </TouchableOpacity>
    </View>
  );
}
