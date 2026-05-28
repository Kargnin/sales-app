import { useState } from "react";
import { View, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Text } from "../../components/ui/text";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../stores/authStore";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 24,
        }}
      >
        <View style={{ gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Text variant="display" color="charcoal">
            FieldSales
          </Text>
          <Text variant="body" color="ash">
            Sign in to your account
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? (
          <Text variant="caption" color="ember" style={{ textAlign: "center" }}>
            {error}
          </Text>
        ) : null}

        <Button variant="primary" loading={loading} onPress={handleLogin}>
          Sign In
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
