import { useState } from "react";
import { View, KeyboardAvoidingView, ScrollView, Platform, Image, TouchableOpacity } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "../../components/ui/text";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/form";
import { useAuthStore } from "../../stores/authStore";
import { loginSchema, type LoginFormValues } from "../../lib/validation";

const mascotWelcome = require("../../../assets/mascot_welcome.png");

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.username, data.password);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid credentials";
      setError("username", { message });
      setError("password", { message });
    }
  };

  const handleForgotPassword = () => {
    router.push("/reset-password");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
        showsVerticalScrollIndicator={false}
        className="relative z-10"
      >
        <View className="flex-1 flex-col gap-7 justify-center">
          {/* Mascot Blob Header */}
          <View className="items-center mb-2">
            <View className="relative w-48 h-48 items-center justify-center">
              <View
                className="w-[180px] h-[180px] rounded-full overflow-hidden border-4 border-surface bg-mascot-sand"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Image source={mascotWelcome} className="w-full h-full" style={{ width: "100%", height: "100%", transform: [{ scale: 1.1 }] }} resizeMode="cover" />
              </View>
              {/* Heart overlay */}
              <View
                className="absolute bottom-0.5 right-2 w-12 h-12 rounded-full bg-surface items-center justify-center border border-stone-border"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Ionicons name="heart" size={20} color="#ff3e00" />
              </View>
            </View>
          </View>

          {/* Welcome Text */}
          <View className="items-center gap-1">
            <Text variant="display" color="charcoal" className="text-center">
              Welcome back
            </Text>
            <Text variant="body" color="ash" className="text-center">
              Sign in to continue to Family.
            </Text>
          </View>

          {/* Inputs */}
          <View className="gap-4">
            <FormField
              name="username"
              control={control}
              label="Username or email"
              placeholder="Username or email"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FormField
              name="password"
              control={control}
              label="Password"
              placeholder="Password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#848281"
                  />
                </TouchableOpacity>
              }
            />

            {/* Forgot Password Link */}
            <View className="flex-row justify-end mt-1">
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Forgot password">
                <Text variant="label-medium" color="ember">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <Button variant="primary" loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
            Sign In
          </Button>

          {/* Footer */}
          <View className="items-center mt-3">
            <Text variant="body" color="ash">
              Don't have an account?{" "}
              <TouchableOpacity onPress={() => router.push("/signup")} activeOpacity={0.7}>
                <Text variant="label-medium" color="charcoal" className="underline">
                  Create an account
                </Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
