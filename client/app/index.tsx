import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../src/stores/authStore";
import tailwindConfig from "../tailwind.config";

const colors = tailwindConfig.theme.extend.colors;

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator size="large" color={colors.midnight} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={user?.role === "admin" ? "/(admin)/dashboard" : "/(salesman)/visits"} />;
}
