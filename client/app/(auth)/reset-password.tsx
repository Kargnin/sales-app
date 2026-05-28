import { View } from "react-native";
import { ResetPasswordForm } from "../../src/features/auth/reset-password-form";

export default function ResetPasswordScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <ResetPasswordForm />
    </View>
  );
}
