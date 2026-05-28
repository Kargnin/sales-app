import { View } from "react-native";
import { LoginForm } from "../../src/features/auth/login-form";

export default function LoginScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <LoginForm />
    </View>
  );
}
