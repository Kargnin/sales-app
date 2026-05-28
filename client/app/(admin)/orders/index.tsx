import { View } from "react-native";
import { Text } from "../../../src/components/ui/text";

export default function OrdersScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fbfaf9", justifyContent: "center", alignItems: "center" }}>
      <Text variant="heading" color="ash">Orders</Text>
    </View>
  );
}
