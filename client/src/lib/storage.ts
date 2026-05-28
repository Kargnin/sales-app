import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    const { default: SecureStore } = await import("expo-secure-store");
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    const { default: SecureStore } = await import("expo-secure-store");
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    const { default: SecureStore } = await import("expo-secure-store");
    return SecureStore.deleteItemAsync(key);
  },
};
