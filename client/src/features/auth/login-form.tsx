import { useState } from "react";
import { View, KeyboardAvoidingView, ScrollView, Platform, Image, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui/text";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../stores/authStore";
import tailwindConfig from "../../../tailwind.config";

const mascotWelcome = require("../../../assets/mascot_welcome.png");
const colors = tailwindConfig.theme.extend.colors;

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Reset Password",
      "Please contact your system administrator to reset your password.",
      [{ text: "OK" }]
    );
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
      >
        <View style={{ flex: 1, flexDirection: "column", gap: 28, justifyContent: "center" }}>
          {/* Mascot Blob Header */}
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <View style={{ position: "relative", width: 192, height: 192, alignItems: "center", justifyContent: "center" }}>
              <View style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                overflow: "hidden",
                borderWidth: 4,
                borderColor: colors.surface,
                backgroundColor: colors["mascot-sand"],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
              }}>
                <Image source={mascotWelcome} style={{ width: "100%", height: "100%", transform: [{ scale: 1.1 }] }} resizeMode="cover" />
              </View>
              {/* Wobbly blob heart overlay */}
              <View style={{
                position: "absolute",
                bottom: 2,
                right: 8,
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors["stone-border"],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 3,
              }}>
                <Ionicons name="heart" size={20} color={colors["ember-orange"]} />
              </View>
            </View>
          </View>

          {/* Welcome Text */}
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text variant="display" color="charcoal" style={{ textAlign: "center" }}>
              Welcome back
            </Text>
            <Text variant="body" color="ash" style={{ textAlign: "center" }}>
              Sign in to continue to Family.
            </Text>
          </View>

          {/* Inputs */}
          <View style={{ gap: 16 }}>
            {/* Email/Username Field */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors["stone-border"],
              borderRadius: 10,
              height: 56,
              paddingHorizontal: 16,
            }}>
              <Ionicons name="mail-outline" size={20} color={colors.ash} style={{ marginRight: 12 }} />
              <TextInput
                style={{
                  flex: 1,
                  fontFamily: "Inter_400",
                  fontSize: 15,
                  color: colors.charcoal,
                  height: "100%",
                }}
                placeholder="Email address"
                placeholderTextColor={colors.ash}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            {/* Password Field */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors["stone-border"],
              borderRadius: 10,
              height: 56,
              paddingHorizontal: 16,
            }}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.ash} style={{ marginRight: 12 }} />
              <TextInput
                style={{
                  flex: 1,
                  fontFamily: "Inter_400",
                  fontSize: 15,
                  color: colors.charcoal,
                  height: "100%",
                }}
                placeholder="Password"
                placeholderTextColor={colors.ash}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={colors.ash}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text variant="label-medium" color="ember">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error message */}
          {error ? (
            <Text variant="caption" color="ember" style={{ textAlign: "center" }}>
              {error}
            </Text>
          ) : null}

          {/* Submit Button */}
          <Button variant="primary" loading={loading} onPress={handleLogin}>
            Sign In
          </Button>

          {/* Footer */}
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <Text variant="body" color="ash">
              Don't have an account?{" "}
              <Text variant="label-medium" color="charcoal" style={{ textDecorationLine: "underline" }}>
                Create an account
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
