import React, { useEffect, useCallback } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { getMenuItems, type MenuItem } from "./sideMenuItems";
import { Text } from "../ui/text";

const mascotPartner = require("../../../assets/mascot_partner.png");
const DRAWER_WIDTH = 320;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SideMenu({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isDrawerOpen = useUIStore((s) => s.isDrawerOpen);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  const isReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isDrawerOpen) {
      if (isReducedMotion) {
        translateX.value = withTiming(0, { duration: 0 });
        backdropOpacity.value = withTiming(1, { duration: 0 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
        backdropOpacity.value = withTiming(1, { duration: 10 });
      }
    } else {
      if (isReducedMotion) {
        translateX.value = withTiming(-DRAWER_WIDTH, { duration: 0 });
        backdropOpacity.value = withTiming(0, { duration: 0 });
      } else {
        translateX.value = withTiming(-DRAWER_WIDTH, { duration: 10 });
        backdropOpacity.value = withTiming(0, { duration: 10 });
      }
    }
  }, [isDrawerOpen, isReducedMotion]);

  const drawerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value * 0.3,
    };
  });

  const username = user?.username || "Michael Chen";
  const userRole = user?.role === "admin" ? "Verified Admin" : "Sales Representative";
  const role = user?.role || "admin";
  const menuItems = getMenuItems(role);

  const handleNavigate = useCallback(
    (route: string) => {
      closeDrawer();
      router.navigate(route);
    },
    [closeDrawer],
  );

  const handleLogout = useCallback(async () => {
    closeDrawer();
    await logout();
    router.replace("/login");
  }, [closeDrawer, logout]);

  const renderItem = useCallback(
    (item: MenuItem) => {
      const isActive = pathname.startsWith(item.route);

      return (
        <TouchableOpacity
          key={item.label}
          onPress={() => handleNavigate(item.route)}
          className={`flex-row items-center gap-3 rounded-xl p-3.5 mx-2 my-0.5 ${isActive ? "bg-surface-recessed border border-stone-border" : "active:bg-surface-recessed/50"
            }`}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel={`Navigate to ${item.label}`}
        >
          <Ionicons
            name={isActive ? item.activeIcon : item.icon}
            size={20}
            color={isActive ? "#343433" : "#474645"}
          />
          <Text
            variant="label-medium"
            color={isActive ? "charcoal" : "graphite"}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [pathname, handleNavigate],
  );

  return (
    <View className="flex-1 relative">
      {/* Main Content Area */}
      <View className="flex-1">{children}</View>

      {/* Backdrop Dimming Overlay */}
      <AnimatedPressable
        pointerEvents={isDrawerOpen ? "auto" : "none"}
        style={backdropAnimatedStyle}
        className="absolute inset-0 bg-[#343433] z-40"
        onPress={closeDrawer}
      />

      {/* Drawer Container */}
      <Animated.View
        style={[
          {
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            elevation: 16,
          },
          drawerAnimatedStyle,
        ]}
        className="absolute left-0 bg-canvas border-r border-stone-border shadow-2xl rounded-r-2xl z-50"
      >
        {/* User Profile Header Section */}
        <View className="px-6 mb-6 flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-full overflow-hidden bg-mascot-peach border border-stone-border flex-shrink-0">
            <Image
              source={mascotPartner}
              style={{ width: "100%", height: "100%", transform: [{ scale: 1.15 }] }}
              resizeMode="cover"
            />
          </View>
          <View className="flex-1 justify-center">
            <Text
              variant="heading-sm"
              color="charcoal"
              className="font-body-semibold text-[17px] leading-[22px] m-0"
              numberOfLines={1}
            >
              {username}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Ionicons name="checkmark-circle" size={14} color="#00ca48" />
              <Text variant="caption" color="ash" className="text-[12px]">
                {userRole}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Navigation Links */}
        <ScrollView className="flex-1 px-2" showsVerticalScrollIndicator={false}>
          {menuItems.primary.map((item) => renderItem(item))}
        </ScrollView>

        {/* Bottom Utility Sections */}
        <View className="mt-auto px-2 pt-4 border-t border-stone-border">
          {menuItems.bottom.map((item) => renderItem(item))}

          {/* Logout Trigger */}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-3 rounded-xl p-3.5 mx-2 my-0.5 mt-4 active:bg-surface-recessed/50"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Logout from account"
          >
            <Ionicons name="log-out-outline" size={20} color="#ff3e00" />
            <Text variant="label-medium" color="ember" className="font-body text-[#ff3e00]">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
