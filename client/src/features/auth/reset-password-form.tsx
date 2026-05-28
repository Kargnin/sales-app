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
import { resetPasswordSchema, type ResetPasswordFormValues } from "../../lib/validation";

const mascotEnvelope = require("../../../assets/mascot_envelope.png");

export function ResetPasswordForm() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await resetPassword(data.email);
      setIsSuccess(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to request password reset link";
      setError("email", { message });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* Top Header transactional back button */}
      <View className="px-6 pt-12 pb-2 flex-row justify-start items-center relative z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full hover:bg-stone-border bg-surface border border-stone-border items-center justify-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="relative z-10"
      >
        <View className="flex-1 flex-col gap-6 justify-center">
          {!isSuccess ? (
            <>
              {/* Illustration Area */}
              <View className="items-center mb-2">
                <View className="relative w-48 h-48 items-center justify-center">
                  <View
                    className="w-[180px] h-[180px] rounded-full overflow-hidden border-4 border-surface bg-mascot-sand"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.08,
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                  >
                    <Image
                      source={mascotEnvelope}
                      className="w-full h-full"
                      style={{ width: "100%", height: "100%", transform: [{ scale: 1.1 }] }}
                      resizeMode="cover"
                    />
                  </View>
                  {/* Mail icon overlay */}
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
                    <Ionicons name="mail-outline" size={22} color="#ff3e00" />
                  </View>
                </View>
              </View>

              {/* Title Header */}
              <View className="items-center gap-1">
                <Text variant="display" color="charcoal" className="text-center">
                  Reset Password
                </Text>
                <Text variant="body" color="ash" className="text-center">
                  Enter your email to receive a reset link.
                </Text>
              </View>

              {/* Form Input Card */}
              <View
                className="bg-surface border border-stone-border rounded-2xl p-6 gap-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <FormField
                  name="email"
                  control={control}
                  label="Email Address"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Button */}
              <Button
                variant="primary"
                loading={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                accessibilityRole="button"
                accessibilityLabel="Send Reset Link"
              >
                Send Reset Link
              </Button>
            </>
          ) : (
            <View
              className="bg-surface border border-stone-border rounded-2xl p-8 items-center gap-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              {/* Success Check Circle */}
              <View className="w-16 h-16 rounded-full bg-success/10 border border-success/20 items-center justify-center">
                <Ionicons name="checkmark-circle" size={36} color="#00ca48" />
              </View>

              <View className="items-center gap-2">
                <Text variant="heading-sm" color="charcoal" className="text-center">
                  Link Sent!
                </Text>
                <Text variant="body" color="ash" className="text-center">
                  Check your inbox for further instructions.
                </Text>
              </View>

              <Button
                variant="secondary"
                onPress={() => router.push("/login")}
                className="w-full mt-2"
                accessibilityRole="button"
                accessibilityLabel="Back to login"
              >
                Back to login
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
