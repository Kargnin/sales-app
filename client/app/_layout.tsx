import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from "@expo-google-fonts/inter";
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
    Inter_400: Inter_400Regular,
    Inter_500: Inter_500Medium,
    Inter_600: Inter_600SemiBold,
    Fraunces_500: Fraunces_500Medium,
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
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </QueryClientProvider>
  );
}
