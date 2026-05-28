import { View } from "react-native";
import { SignupForm } from "../../src/features/auth/signup-form";

export default function SignupScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <SignupForm />
    </View>
  );
}
