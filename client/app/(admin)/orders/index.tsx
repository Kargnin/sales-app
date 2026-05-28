import { View } from "react-native";
import { Text } from "../../../src/components/ui/text";
import tailwindConfig from "../../../tailwind.config";

const colors = tailwindConfig.theme.extend.colors;

export default function OrdersScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: "center", alignItems: "center" }}>
      <Text variant="heading" color="ash">Orders</Text>
    </View>
  );
}
