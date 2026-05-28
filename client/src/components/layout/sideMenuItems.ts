import type { Ionicons } from "@expo/vector-icons";

export interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const ADMIN_ITEMS: MenuItem[] = [
  { icon: "grid-outline", activeIcon: "grid", label: "Dashboard", route: "/(admin)/dashboard" },
  { icon: "storefront-outline", activeIcon: "storefront", label: "Shops", route: "/(admin)/shops" },
  { icon: "cube-outline", activeIcon: "cube", label: "Product Catalog", route: "/(admin)/orders" },
  { icon: "time-outline", activeIcon: "time", label: "Visit History", route: "/(admin)/more" },
  { icon: "people-outline", activeIcon: "people", label: "Team Management", route: "/(admin)/team" },
  { icon: "checkmark-done-circle-outline", activeIcon: "checkmark-done-circle", label: "Shop Approvals", route: "/(admin)/more" },
];

const SALESMAN_ITEMS: MenuItem[] = [
  { icon: "storefront-outline", activeIcon: "storefront", label: "My Shops", route: "/(admin)/shops" },
  { icon: "time-outline", activeIcon: "time", label: "Visit History", route: "/(admin)/more" },
];

const BOTTOM_ITEMS: MenuItem[] = [
  { icon: "settings-outline", activeIcon: "settings", label: "Settings", route: "/(admin)/more" },
  { icon: "help-circle-outline", activeIcon: "help-circle", label: "Support", route: "/(admin)/more" },
];

export function getMenuItems(role: "admin" | "salesman"): { primary: MenuItem[]; bottom: MenuItem[] } {
  const primary = role === "admin" ? ADMIN_ITEMS : SALESMAN_ITEMS;
  return { primary, bottom: BOTTOM_ITEMS };
}
