import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../src/components/ui/text";
import { Button } from "../../../src/components/ui/button";
import { apiClient } from "../../../src/lib/apiClient";
import type { User } from "../../../src/types";

export default function TeamScreen() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<User[]>("/api/users");
      setEmployees(data || []);
    } catch (e: unknown) {
      console.error("Error fetching employees:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleGenerateInvite = async () => {
    try {
      setIsGenerating(true);
      const res = await apiClient<{ inviteToken: string }>(
        "/api/users/generate-invite",
        {
          method: "POST",
        },
      );
      // Build link targeting our public acceptance route.
      // Strip trailing slashes from the base so the join is always clean
      // (e.g. "salesapp://" + "/invite/x" -> "salesapp://invite/x").
      const inviteBaseUrl = (
        process.env.EXPO_PUBLIC_INVITE_BASE_URL ?? "salesapp://"
      ).replace(/\/+$/, "");
      const resolvedLink = `${inviteBaseUrl}/invite/${res.inviteToken}`;
      setInviteLink(resolvedLink);
      setCopied(false);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to generate invite token";
      Alert.alert("Error", message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      Clipboard.setString(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40 }}
      className="bg-canvas"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-col gap-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="heading" color="charcoal">
              Team Management
            </Text>
            <Text variant="caption" color="ash">
              Manage and invite your field representatives.
            </Text>
          </View>
          <View className="w-10 h-10 rounded-full bg-surface border border-stone-border items-center justify-center">
            <Ionicons name="people" size={20} color="#1c1b1b" />
          </View>
        </View>

        {/* Generate Invitation Card */}
        <View
          className="bg-surface border border-stone-border rounded-2xl p-6 gap-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.02,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-ember-orange/10 border border-ember-orange/20 items-center justify-center">
              <Ionicons name="mail-open-outline" size={20} color="#ff3e00" />
            </View>
            <View className="flex-1">
              <Text variant="label-medium" color="charcoal">
                Invite Field Salesman
              </Text>
              <Text variant="caption" color="ash">
                Generate a single-use token valid for 7 days.
              </Text>
            </View>
          </View>

          {inviteLink ? (
            <View className="gap-3 mt-2">
              <View className="bg-surface-recessed border border-stone-border rounded-xl p-3 flex-row items-center justify-between">
                <Text
                  variant="caption"
                  color="charcoal"
                  className="flex-1 mr-4"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {inviteLink}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
                    copied
                      ? "bg-success/15 border border-success/30"
                      : "bg-midnight"
                  }`}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={14}
                    color={copied ? "#00ca48" : "#ffffff"}
                  />
                  <Text
                    variant="caption"
                    color={copied ? "success" : "surface"}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setInviteLink(null)}
                className="items-center py-1"
                activeOpacity={0.7}
              >
                <Text variant="caption" color="ash" className="underline">
                  Generate another invite link
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              variant="secondary"
              loading={isGenerating}
              onPress={handleGenerateInvite}
              className="mt-2"
              accessibilityRole="button"
              accessibilityLabel="Generate invitation link"
            >
              Generate Invite Link
            </Button>
          )}
        </View>

        {/* Representatives List */}
        <View className="gap-3">
          <Text variant="label-medium" color="charcoal">
            Active Members
          </Text>

          {isLoading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator color="#ff3e00" />
            </View>
          ) : employees.length === 0 ? (
            <View className="border border-stone-border border-dashed rounded-2xl py-12 px-6 items-center justify-center bg-surface">
              <Ionicons name="people-outline" size={32} color="#a7a7a7" />
              <Text variant="body" color="ash" className="text-center mt-2">
                No employees registered yet.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {employees.map((member) => (
                <View
                  key={member.id}
                  className="bg-surface border border-stone-border rounded-xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-stone-border items-center justify-center">
                      <Text variant="label-medium" color="charcoal">
                        {member.username.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text variant="label-medium" color="charcoal">
                        {member.username}
                      </Text>
                      <Text variant="caption" color="ash">
                        {member.role === "admin"
                          ? "Administrator"
                          : "Sales Representative"}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-full border ${
                      member.status === "active"
                        ? "bg-success/10 border-success/20"
                        : "bg-stone-border/20 border-stone-border"
                    }`}
                  >
                    <Text
                      variant="caption"
                      color={member.status === "active" ? "success" : "ash"}
                      className="text-[10px]"
                    >
                      {member.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
