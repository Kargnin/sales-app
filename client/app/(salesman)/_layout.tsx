import { Stack } from "expo-router";

export default function SalesmanLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fbfaf9" },
      }}
    />
  );
}
