import { View } from "react-native";
import { LoginForm } from "../src/features/auth/login-form";
import tailwindConfig from "../tailwind.config";

const colors = tailwindConfig.theme.extend.colors;

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <LoginForm />
    </View>
  );
}
