import { Tabs, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Image, TouchableOpacity } from "react-native";
import { useMemo } from "react";
import { Text } from "../../src/components/ui/text";
import { SideMenu } from "../../src/components/layout/SideMenu";
import { useUIStore } from "../../src/stores/uiStore";

const ACTIVE_COLOR = "#ff3e00";
const INACTIVE_COLOR = "#848281";
const CANVAS = "#fbfaf9";
const STONE_BORDER = "#f2f0ed";
const mascotPartner = require("../../assets/mascot_partner.png");

function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const openDrawer = useUIStore((s) => s.openDrawer);

  // Determine current active tab
  const activeTab = segments[segments.length - 1] || "dashboard";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning, Partner";
    if (hour >= 12 && hour < 18) return "Good afternoon, Partner";
    return "Good evening, Partner";
  }, []);

  const headerTitle = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return greeting;
      case "shops":
        return "Shops";
      case "orders":
        return "Orders";
      case "team":
        return "Team Management";
      case "more":
        return "More Options";
      default:
        return "Sales App";
    }
  }, [activeTab, greeting]);

  return (
    <View
      className="flex-row items-center justify-between px-4 border-b border-stone-border bg-canvas"
      style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
    >
      <View className="flex-row items-center gap-3 flex-1 mr-4">
        <TouchableOpacity
          onPress={openDrawer}
          className="w-10 h-10 rounded-full bg-mascot-peach overflow-hidden border border-stone-border"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open side menu"
        >
          <Image
            source={mascotPartner}
            style={{ width: "100%", height: "100%", transform: [{ scale: 1.15 }] }}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <Text
          variant="heading"
          color="charcoal"
          className="flex-1 text-[21px] leading-[26px]"
          numberOfLines={1}
        >
          {headerTitle}
        </Text>
      </View>
      <TouchableOpacity
        className="w-10 h-10 rounded-full bg-surface border border-stone-border items-center justify-center shadow-sm"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={20} color="#343433" />
      </TouchableOpacity>
    </View>
  );
}

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <SideMenu>
      <View className="flex-1 bg-canvas">
        <GlobalHeader />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: ACTIVE_COLOR,
            tabBarInactiveTintColor: INACTIVE_COLOR,
            tabBarStyle: {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: CANVAS,
              borderTopWidth: 1,
              borderTopColor: STONE_BORDER,
              height: insets.bottom + 66,
              paddingTop: 8,
              paddingBottom: insets.bottom + 4,
            },
            tabBarLabelStyle: {
              fontFamily: "Inter_500",
              fontSize: 11,
              fontWeight: "500",
            },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="shops"
            options={{
              title: "Shops",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "storefront" : "storefront-outline"} size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="orders"
            options={{
              title: "Orders",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "cart" : "cart-outline"} size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="team"
            options={{
              title: "Team",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: "More",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline"} size={22} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </SideMenu>
  );
}
