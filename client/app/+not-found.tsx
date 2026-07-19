import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "../src/components/ui/text";
import { Button } from "../src/components/ui/button";
import { Card } from "../src/components/ui/card";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-canvas items-center justify-center px-6 gap-5">
      <View className="w-24 h-24 rounded-full bg-surface-recessed items-center justify-center">
        <Ionicons name="alert-circle-outline" size={44} color="#848281" />
      </View>
      <View className="gap-2 items-center">
        <Text variant="heading" color="charcoal" className="text-center">
          Page not found
        </Text>
        <Text variant="body" color="ash" className="text-center leading-6">
          Sorry, the page you're looking for{"\n"}
          doesn't exist or has been moved.
        </Text>
      </View>
      <Button variant="secondary" onPress={() => router.replace("/")}>
        Go to Home
      </Button>
    </View>
  );
}
