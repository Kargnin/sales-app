import "../global.css";

import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from "@expo-google-fonts/inter";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { queryClient } from "../src/lib/queryClient";
import { useAuthStore } from "../src/stores/authStore";

function AuthRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";

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
      <View className="flex-1 justify-center items-center bg-canvas">
        <ActivityIndicator size="large" color="#121212" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <AuthRedirect />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(admin)" />
          </Stack>
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
