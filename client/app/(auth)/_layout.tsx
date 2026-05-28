import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: "#121212",
        headerStyle: { backgroundColor: "#fbfaf9" },
        contentStyle: { backgroundColor: "#fbfaf9" },
        headerTitleStyle: { fontFamily: "Inter_600", fontSize: 17 },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="invite/[token]" options={{ title: "Accept Invitation" }} />
    </Stack>
  );
}
