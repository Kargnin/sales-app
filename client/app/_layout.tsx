import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "@expo-google-fonts/inter";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces";
import { ActivityIndicator, View } from "react-native";
import { queryClient } from "../src/lib/queryClient";
import { useAuthStore } from "../src/stores/authStore";

function AuthRedirect() {
  const { isAuthenticated, isLoading, user, hydrate } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "login";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace(user?.role === "admin" ? "/(admin)/dashboard" : "/(salesman)/visits");
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400: require("@expo-google-fonts/inter/Inter_400.ttf"),
    Inter_500: require("@expo-google-fonts/inter/Inter_500.ttf"),
    Inter_600: require("@expo-google-fonts/inter/Inter_600.ttf"),
    Fraunces_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fbfaf9" }}>
        <ActivityIndicator size="large" color="#121212" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(salesman)" />
      </Stack>
    </QueryClientProvider>
  );
}
