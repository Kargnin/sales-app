import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../src/stores/authStore";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-canvas">
        <ActivityIndicator size="large" color="#121212" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={user?.role === "admin" ? "/(admin)/dashboard" : "/(salesman)/visits"} />;
}
