import { Stack } from "expo-router";

export default function ProductsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Product Details",
          headerBackTitle: "Catalog",
          headerStyle: { backgroundColor: "#fbfaf9" },
          headerTintColor: "#343433",
          headerTitleStyle: { fontFamily: "Inter_600", fontSize: 17 },
          headerShadowVisible: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
