import { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { FormField } from "../../../src/components/form";
import { useAuthStore } from "../../../src/stores/authStore";
import { apiClient } from "../../../src/lib/apiClient";
import { registerSalesmanSchema } from "@sales-app/shared";
import { z } from "zod";

// Derived from the shared schema: `token` comes from route params, not the form.
const inviteAcceptSchema = registerSalesmanSchema.omit({ token: true });
type InviteAcceptFormValues = z.infer<typeof inviteAcceptSchema>;

const bgBlobLeft = require("../../../assets/bg_blob_left.png");
const bgBlobRight = require("../../../assets/bg_blob_right.png");

export default function InviteAcceptScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const registerSalesman = useAuthStore((s) => s.registerSalesman);

  const [isVerifying, setIsVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<{
    tenantId: string;
    tenantName: string;
    role: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<InviteAcceptFormValues>({
    resolver: zodResolver(inviteAcceptSchema as any),
    defaultValues: { username: "", password: "", email: "", phone: "" },
  });

  useEffect(() => {
    const verifyToken = async () => {
      try {
        setIsVerifying(true);
        setVerifyError(null);
        const res = await apiClient<{
          tenantId: string;
          tenantName: string;
          role: string;
        }>("/auth/verify-invite", {
          method: "POST",
          body: { token },
        });
        setInviteDetails(res);
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "Invalid or expired invitation token";
        setVerifyError(message);
      } finally {
        setIsVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const onSubmit = async (data: InviteAcceptFormValues) => {
    if (!token) return;
    try {
      await registerSalesman(
        token,
        data.username,
        data.password,
        data.email || "",
        data.phone || "",
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Registration failed";
      if (message.toLowerCase().includes("username")) {
        setError("username", { message });
      } else {
        setError("username", { message });
      }
    }
  };

  if (isVerifying) {
    return (
      <View className="flex-1 justify-center items-center bg-canvas">
        <ActivityIndicator size="large" color="#ff3e00" />
        <Text variant="body" color="ash" className="mt-4">
          Verifying invitation link...
        </Text>
      </View>
    );
  }

  if (verifyError || !inviteDetails) {
    return (
      <View className="flex-1 justify-center items-center bg-canvas px-6">
        <View
          className="bg-surface border border-stone-border rounded-2xl p-8 items-center gap-6 w-full max-w-sm"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <View className="w-16 h-16 rounded-full bg-ember-orange/10 border border-ember-orange/20 items-center justify-center">
            <Ionicons name="warning-outline" size={32} color="#ff3e00" />
          </View>

          <View className="items-center gap-2">
            <Text variant="heading-sm" color="charcoal" className="text-center">
              Invalid Invitation
            </Text>
            <Text variant="body" color="ash" className="text-center">
              {verifyError ||
                "This invitation token is invalid or has expired."}
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
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* Background Decorative Blobs */}
      <View className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Image
          source={bgBlobLeft}
          className="absolute -bottom-10 -left-10 w-48 h-48 md:w-64 md:h-64 opacity-[0.35]"
          style={{ transform: [{ rotate: "12deg" }] }}
          resizeMode="contain"
        />
        <Image
          source={bgBlobRight}
          className="absolute bottom-10 -right-12 w-40 h-40 md:w-56 md:h-56 opacity-[0.25]"
          style={{ transform: [{ rotate: "-12deg" }] }}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingVertical: 40,
        }}
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
                Create your sales account for{" "}
                <Text variant="label-medium" color="charcoal">
                  {inviteDetails.tenantName}
                </Text>
              </Text>
            </View>
          </View>

          {/* Form Card Input Area */}
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
              name="phone"
              control={control}
              label="Phone Number (Optional)"
              placeholder="1234567890"
              keyboardType="phone-pad"
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
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
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
            Complete Registration
          </Button>

          {/* Footer Link */}
          <View className="items-center mt-2">
            <Text variant="body" color="ash">
              Already have an account?{" "}
              <TouchableOpacity
                onPress={() => router.push("/login")}
                activeOpacity={0.7}
              >
                <Text
                  variant="label-medium"
                  color="charcoal"
                  className="underline"
                >
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
