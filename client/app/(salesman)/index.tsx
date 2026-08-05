import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/button";
import { Text } from "../../src/components/ui/text";
import { useAuthStore } from "../../src/stores/authStore";

const FALLBACK_USERNAME = "Partner";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function SalesmanHomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View
      className="flex-1 bg-canvas px-6 gap-6"
      style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
    >
      <View className="gap-2">
        <Text variant="display" color="charcoal">
          {getGreeting()}, {user?.username ?? FALLBACK_USERNAME}
        </Text>
        <Text variant="body" color="ash">
          Salesman experience is being built
        </Text>
      </View>

      <View className="flex-1" />

      <Button variant="primary" onPress={handleLogout}>
        Logout
      </Button>
    </View>
  );
}
