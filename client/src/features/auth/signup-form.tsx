import { useState } from "react";
import { View, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Image } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "../../components/ui/text";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/form";
import { useAuthStore } from "../../stores/authStore";
import { signupSchema, type SignupFormValues } from "../../lib/validation";

const bgBlobLeft = require("../../../assets/bg_blob_left.png");
const bgBlobRight = require("../../../assets/bg_blob_right.png");

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const register = useAuthStore((s) => s.register);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { businessName: "", username: "", email: "", phone: "", password: "" },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await register(
        data.businessName,
        data.username,
        data.email || "",
        data.phone || "",
        data.password
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Registration failed";
      // Map general or server errors to form fields or a root error alert
      if (message.toLowerCase().includes("username")) {
        setError("username", { message });
      } else if (message.toLowerCase().includes("email")) {
        setError("email", { message });
      } else if (message.toLowerCase().includes("business")) {
        setError("businessName", { message });
      } else {
        setError("username", { message });
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* Background Decorative Blobs */}
      <View className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Image
          source={bgBlobRight}
          className="absolute -bottom-10 -left-10 opacity-[0.35] rounded-full"
          style={{ width: "60%", height: "60%", transform: [{ rotate: "12deg" }] }}
          resizeMode="cover"
        />
        <Image
          source={bgBlobLeft}
          className="absolute bottom-50 -right-12 w-40 h-40 md:w-56 md:h-56 opacity-[0.25]"
          style={{ width: "60%", height: "60%", transform: [{ rotate: "-12deg" }] }}
          resizeMode="cover"
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
        showsVerticalScrollIndicator={false}
        className="relative z-10"
      >
        <View className="flex-1 flex-col gap-6 justify-center">
          {/* Header Icon & Text */}
          <View className="items-center gap-4">
            <View
              className="w-16 h-16 rounded-xl bg-surface border border-stone-border items-center justify-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="people-outline" size={32} color="#000000" />
            </View>

            <View className="items-center gap-1">
              <Text variant="display" color="charcoal" className="text-center">
                Join the Family
              </Text>
              <Text variant="body" color="ash" className="text-center">
                Start managing your field operations today.
              </Text>
            </View>
          </View>

          {/* Form Card Input Area */}
          <View
            className="bg-surface/20 border border-stone-border rounded-2xl p-6 gap-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <FormField
              name="businessName"
              control={control}
              label="Business Name"
              placeholder="Acme Corp"
              autoCapitalize="words"
            />

            <FormField
              name="username"
              control={control}
              label="Username"
              placeholder="jane_doe"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FormField
              name="email"
              control={control}
              label="Email Address (Optional)"
              placeholder="jane@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FormField
              name="password"
              control={control}
              label="Password"
              placeholder="••••••••"
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
          </View>

          {/* Submit Button */}
          <Button
            variant="primary"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
          >
            Create Account
          </Button>

          {/* Footer Link */}
          <View className="items-center mt-2">
            <Text variant="body" color="ash">
              Already have an account?{" "}
              <TouchableOpacity onPress={() => router.push("/login")} activeOpacity={0.7}>
                <Text variant="label-medium" color="charcoal" className="underline">
                  Sign In
                </Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
