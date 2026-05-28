import { View } from "react-native";
import { LoginForm } from "../src/features/auth/login-form";

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fbfaf9" }}>
      <LoginForm />
    </View>
  );
}
