# Expo Migration + Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the client from Ionic/Capacitor to React Native + Expo, starting with login and admin dashboard, using the Stitch "Warm Tactile Industrial" design system.

**Architecture:** Expo Router file-based routing with role-based layout groups. NativeWind v5 for styling with Stitch design tokens. React Native Reusables headless primitives customized to brand. Zustand (client UI state only) + TanStack Query (server data) ported from the old codebase. `expo-secure-store` for tokens. Mock data at the query hook level for missing endpoints.

**Tech Stack:** Expo SDK, Expo Router, NativeWind v5, React Native Reusables, TanStack Query, Zustand, Inter + Fraunces fonts

---

## Phase 1: Project Scaffold

### Task 1: Rename old client directory

**Files:**
- Rename: `client/` → `client-old/`

- [ ] **Step 1: Rename the directory**

```bash
cd "/Users/bhushanmalani/Code/Sales App" && mv client client-old
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: rename client to client-old ahead of Expo migration"
```

### Task 2: Create Expo project

**Files:**
- Create: `client/` (Expo project via `create-expo-app`)

- [ ] **Step 1: Scaffold Expo project**

```bash
cd "/Users/bhushanmalani/Code/Sales App" && npx create-expo-app@latest client --template blank-typescript
```

- [ ] **Step 2: Verify scaffold**

```bash
cd client && npx expo start --no-dev --port 8081 &
sleep 5 && kill %1
```

Expected: Expo dev server starts without errors.

- [ ] **Step 3: Commit**

```bash
git add client/ && git commit -m "feat: scaffold Expo project with blank-typescript template"
```

### Task 3: Install core dependencies

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install navigation, styling, state management, and UI primitives**

```bash
cd "/Users/bhushanmalani/Code/Sales App/client" && \
npx expo install expo-router expo-linking expo-constants expo-secure-store expo-font expo-status-bar && \
npx expo install react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated && \
npm install @tanstack/react-query zustand nativewind react-native-reusables && \
npm install -D tailwindcss @tailwindcss/postcss postcss
```

- [ ] **Step 2: Install fonts**

```bash
cd "/Users/bhushanmalani/Code/Sales App/client" && \
npm install @expo-google-fonts/inter @expo-google-fonts/fraunces
```

- [ ] **Step 3: Commit**

```bash
git add client/package.json client/package-lock.json && git commit -m "chore: install Expo Router, NativeWind, TanStack Query, Zustand, fonts"
```

### Task 4: Configure NativeWind v5 with Stitch design tokens

**Files:**
- Create: `client/tailwind.config.ts`
- Create: `client/nativewind-env.d.ts`
- Create: `client/postcss.config.mjs`
- Modify: `client/package.json` (entry point for Expo Router)
- Modify: `client/app.json`
- Modify: `client/tsconfig.json`

- [ ] **Step 1: Create NativeWind type declaration**

```ts
// client/nativewind-env.d.ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 2: Create PostCSS config**

```mjs
// client/postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 3: Create Tailwind config with Stitch tokens**

```ts
// client/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#fbfaf9",
        surface: "#ffffff",
        "surface-recessed": "#f8f7f4",
        "stone-border": "#f2f0ed",
        graphite: "#474645",
        charcoal: "#343433",
        ash: "#848281",
        midnight: "#121212",
        "ember-orange": "#ff3e00",
        success: "#00ca48",
        info: "#0090ff",
        warning: "#ffbb26",
      },
      fontFamily: {
        display: ["Fraunces_500"],
        body: ["Inter_400"],
        "body-medium": ["Inter_500"],
        "body-semibold": ["Inter_600"],
      },
      spacing: {
        xs: "8",
        sm: "12",
        md: "24",
        lg: "32",
      },
      borderRadius: {
        DEFAULT: "10px",
        pill: "9999px",
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 4: Update app.json for Expo Router**

In `client/app.json`, add the scheme:

```json
{
  "expo": {
    "scheme": "salesapp",
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 5: Update package.json entry point**

Ensure `client/package.json` has:
```json
{
  "main": "expo-router/entry"
}
```

- [ ] **Step 6: Update tsconfig.json with path aliases**

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@src/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@stores/*": ["./src/stores/*"],
      "@lib/*": ["./src/lib/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add client/tailwind.config.ts client/nativewind-env.d.ts client/postcss.config.mjs client/app.json client/package.json client/tsconfig.json && \
git commit -m "feat: configure NativeWind v5 with Stitch Warm Tactile Industrial design tokens"
```

### Task 5: Create directory structure

**Files:**
- Create: All empty directories (setup placeholder files)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p "/Users/bhushanmalani/Code/Sales App/client/app" \
  "/Users/bhushanmalani/Code/Sales App/client/app/(admin)" \
  "/Users/bhushanmalani/Code/Sales App/client/app/(salesman)" \
  "/Users/bhushanmalani/Code/Sales App/client/src/components/ui" \
  "/Users/bhushanmalani/Code/Sales App/client/src/components/shared" \
  "/Users/bhushanmalani/Code/Sales App/client/src/features/dashboard" \
  "/Users/bhushanmalani/Code/Sales App/client/src/features/shops" \
  "/Users/bhushanmalani/Code/Sales App/client/src/features/orders" \
  "/Users/bhushanmalani/Code/Sales App/client/src/features/visits" \
  "/Users/bhushanmalani/Code/Sales App/client/src/features/auth" \
  "/Users/bhushanmalani/Code/Sales App/client/src/hooks/queries" \
  "/Users/bhushanmalani/Code/Sales App/client/src/stores" \
  "/Users/bhushanmalani/Code/Sales App/client/src/lib" \
  "/Users/bhushanmalani/Code/Sales App/client/src/types" \
  "/Users/bhushanmalani/Code/Sales App/client/assets"
```

- [ ] **Step 2: Commit**

```bash
git add client/src/ && git commit -m "chore: create directory structure for features, components, hooks, stores"
```

---

## Phase 2: Core Layer — API, Auth, Queries, Stores

### Task 6: Port TypeScript types

**Files:**
- Create: `client/src/types/index.ts`

- [ ] **Step 1: Create types file**

```ts
// client/src/types/index.ts

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "salesman";
  status: "active" | "inactive";
  createdAt: string;
}

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  ownerName: string | null;
  phone: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  status: "approved" | "pending_approval" | "rejected";
  createdAt: string;
}

export interface Visit {
  id: string;
  tenantId: string;
  salesmanId: string;
  salesmanName?: string;
  shopId: string;
  shopName: string;
  latitude: string;
  longitude: string;
  gpsVerified: boolean;
  photoUrl: string | null;
  notes: string | null;
  visitedAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  price: string;
  stockQuantity: number;
  createdAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  shopId: string;
  shopName?: string;
  salesmanId: string | null;
  salesmanName?: string;
  orderSource: "salesman" | "whatsapp" | "meesho" | "admin_self";
  status: "pending_approval" | "confirmed" | "cancelled" | "dispatched" | "delivered";
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  cancellationToken?: string | null;
  totalAmount: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface DashboardMetrics {
  totalRevenue: string;
  totalOrders: number;
  totalVisits: number;
  activeSalesmen: number;
  revenueChange: number;     // percentage from last period
  ordersChange: number;
  visitsChange: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "shop_approval" | "order_status" | "system" | "new_order" | "new_visit";
  isRead: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types/index.ts && git commit -m "feat: add TypeScript types for all domain entities and dashboard metrics"
```

### Task 7: Create API client

**Files:**
- Create: `client/src/lib/apiClient.ts`
- Create: `client/src/lib/constants.ts` (optional if not needed yet, skip if empty)

Move ported code from `client-old/src/api/client.ts` with axios → fetch, preserving JWT interceptor logic.

- [ ] **Step 1: Create constants**

```ts
// client/src/lib/constants.ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
```

- [ ] **Step 2: Create API client**

```ts
// client/src/lib/apiClient.ts
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./constants";

interface RequestConfig extends Omit<RequestInit, "body"> {
  body?: unknown;
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

export async function apiClient<T = unknown>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync("accessToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...config,
    headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
  });

  if (response.status === 401 && !config._retry) {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");

    if (config.url === "/auth/refresh" || config.url === "/auth/login" || !refreshToken) {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      throw new Error("Unauthorized");
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        headers["Authorization"] = `Bearer ${newToken}`;
        return fetch(url, { ...config, headers, body: config.body ? JSON.stringify(config.body) : undefined }).then((res) => res.json());
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) throw new Error("Refresh failed");

      const data = await refreshResponse.json();
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken || refreshToken;

      await SecureStore.setItemAsync("accessToken", newAccessToken);
      await SecureStore.setItemAsync("refreshToken", newRefreshToken);

      isRefreshing = false;
      processQueue(null, newAccessToken);

      headers["Authorization"] = `Bearer ${newAccessToken}`;
      const retryResponse = await fetch(url, {
        ...config,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });
      return retryResponse.json();
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError, null);
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      throw refreshError;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/apiClient.ts client/src/lib/constants.ts && git commit -m "feat: port API client from axios to fetch with expo-secure-store JWT refresh"
```

### Task 8: Port auth store (Zustand)

**Files:**
- Create: `client/src/stores/authStore.ts`
- Copy/adapt from: `client-old/src/stores/authStore.ts`

Port the auth store, replacing any cookie/localStorage access with `expo-secure-store`.

- [ ] **Step 1: Create auth store**

```ts
// client/src/stores/authStore.ts
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "../lib/apiClient";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    const data = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });

    await SecureStore.setItemAsync("accessToken", data.accessToken);
    await SecureStore.setItemAsync("refreshToken", data.refreshToken);

    set({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const refreshToken = await SecureStore.getItemAsync("refreshToken");

      if (token) {
        const user = await apiClient<User>("/auth/me");
        set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      set({ isLoading: false });
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add client/src/stores/authStore.ts && git commit -m "feat: port auth store to Zustand with expo-secure-store persistence"
```

### Task 9: Port TanStack Query hooks

**Files:**
- Create: `client/src/lib/queryClient.ts`
- Create: `client/src/hooks/queries/useOrders.ts`
- Create: `client/src/hooks/queries/useVisits.ts`
- Create: `client/src/hooks/queries/useShops.ts`
- Create: `client/src/hooks/queries/useProducts.ts`
- Create: `client/src/hooks/queries/useEmployees.ts`
- Adapt from: `client-old/src/hooks/queries/`

Port each query hook. Existing API endpoints are called via `apiClient`. Missing dashboard metrics data will be mocked in a later task.

- [ ] **Step 1: Create query client**

```ts
// client/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});
```

- [ ] **Step 2: Create useOrders hook**

```ts
// client/src/hooks/queries/useOrders.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Order } from "../../types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient<Order[]>("/orders"),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiClient<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}
```

- [ ] **Step 3: Create useVisits hook**

```ts
// client/src/hooks/queries/useVisits.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Visit } from "../../types";

export function useVisits() {
  return useQuery({
    queryKey: ["visits"],
    queryFn: () => apiClient<Visit[]>("/visits"),
  });
}
```

- [ ] **Step 4: Create useShops hook**

```ts
// client/src/hooks/queries/useShops.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Shop } from "../../types";

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => apiClient<Shop[]>("/shops"),
  });
}
```

- [ ] **Step 5: Create useProducts hook**

```ts
// client/src/hooks/queries/useProducts.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Product } from "../../types";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiClient<Product[]>("/products"),
  });
}
```

- [ ] **Step 6: Create useEmployees hook**

```ts
// client/src/hooks/queries/useEmployees.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { User } from "../../types";

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: () => apiClient<User[]>("/employees"),
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/queryClient.ts client/src/hooks/ && git commit -m "feat: port TanStack Query hooks for orders, visits, shops, products, employees"
```

---

## Phase 3: UI Primitives from Stitch Design System

### Task 10: Create Text component (Stitch typography)

**Files:**
- Create: `client/src/components/ui/text.tsx`

- [ ] **Step 1: Create Text variants**

```tsx
// client/src/components/ui/text.tsx
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

type TextVariant = "display" | "heading" | "heading-sm" | "body" | "label-medium" | "caption";

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: "graphite" | "charcoal" | "ash" | "midnight" | "ember" | "surface";
}

const variantStyles: Record<TextVariant, { fontFamily: string; fontSize: number; letterSpacing: number; lineHeight: number }> = {
  display:       { fontFamily: "Fraunces_500", fontSize: 32, letterSpacing: -0.8, lineHeight: 35.2 },
  heading:       { fontFamily: "Inter_600",    fontSize: 23, letterSpacing: -0.44, lineHeight: 27.6 },
  "heading-sm":  { fontFamily: "Inter_600",    fontSize: 19, letterSpacing: -0.25, lineHeight: 26.22 },
  body:          { fontFamily: "Inter_400",    fontSize: 15, letterSpacing: -0.2,  lineHeight: 22.05 },
  "label-medium":{ fontFamily: "Inter_500",    fontSize: 15, letterSpacing: -0.2,  lineHeight: 22.05 },
  caption:       { fontFamily: "Inter_400",    fontSize: 12, letterSpacing: -0.14, lineHeight: 18.96 },
};

const colorMap: Record<NonNullable<TextProps["color"]>, string> = {
  graphite: "#474645",
  charcoal: "#343433",
  ash: "#848281",
  midnight: "#121212",
  ember: "#ff3e00",
  surface: "#ffffff",
};

export function Text({ variant = "body", color = "graphite", style, children, ...props }: TextProps) {
  const v = variantStyles[variant];
  return (
    <RNText
      style={[
        {
          fontFamily: v.fontFamily,
          fontSize: v.fontSize,
          letterSpacing: v.letterSpacing,
          lineHeight: v.lineHeight,
          color: colorMap[color],
        },
        style,
      ]}
      selectable
      {...props}
    >
      {children}
    </RNText>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/text.tsx && git commit -m "feat: add Stitch typography Text component with variant and color tokens"
```

### Task 11: Create Button component (Stitch buttons)

**Files:**
- Create: `client/src/components/ui/button.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// client/src/components/ui/button.tsx
import { Pressable, type PressableProps, ActivityIndicator } from "react-native";
import { Text } from "./text";

interface ButtonProps extends PressableProps {
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: string;
}

export function Button({ variant = "primary", loading, children, disabled, style, ...props }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: isPrimary ? "#121212" : "#f2f0ed",
          borderRadius: 9999,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: pressed || disabled ? 0.7 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator color={isPrimary ? "#ffffff" : "#474645"} />}
      <Text variant="label-medium" color={isPrimary ? "surface" : "graphite"}>
        {children}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/button.tsx && git commit -m "feat: add Stitch Button component with primary/secondary pill variants"
```

### Task 12: Create Card component (Stitch inset border pattern)

**Files:**
- Create: `client/src/components/ui/card.tsx`

- [ ] **Step 1: Create Card component**

```tsx
// client/src/components/ui/card.tsx
import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  recessed?: boolean;
}

export function Card({ recessed, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: recessed ? "#f8f7f4" : "#ffffff",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#f2f0ed",
          padding: 20,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/card.tsx && git commit -m "feat: add Stitch Card component with stone inset border and surface tiering"
```

### Task 13: Create Input component (Stitch inputs)

**Files:**
- Create: `client/src/components/ui/input.tsx`

- [ ] **Step 1: Create Input component**

```tsx
// client/src/components/ui/input.tsx
import { TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./text";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label-medium" color="charcoal">
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: error ? "#ff3e00" : "#f2f0ed",
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontFamily: "Inter_400",
            fontSize: 15,
            color: "#474645",
          },
          style,
        ]}
        placeholderTextColor="#848281"
        {...props}
      />
      {error && (
        <Text variant="caption" color="ember">
          {error}
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/input.tsx && git commit -m "feat: add Stitch Input component with stone inset border and error state"
```

---

## Phase 4: Auth Flow

### Task 14: Load fonts in root layout

**Files:**
- Create: `client/app/_layout.tsx`

- [ ] **Step 1: Create root layout with font loading, providers, and auth redirect**

```tsx
// client/app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack, router, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "@expo-google-fonts/inter";
import { Fraunces_500 } from "@expo-google-fonts/fraunces";
import { ActivityIndicator, View } from "react-native";
import { queryClient } from "../src/lib/queryClient";
import { useAuthStore } from "../src/stores/authStore";
import { Text } from "../src/components/ui/text";

function AuthRedirect() {
  const { isAuthenticated, isLoading, user, hydrate } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "login";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace(user?.role === "admin" ? "/(admin)/dashboard" : "/(salesman)/visits");
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400: require("@expo-google-fonts/inter/Inter_400.ttf"),
    Inter_500: require("@expo-google-fonts/inter/Inter_500.ttf"),
    Inter_600: require("@expo-google-fonts/inter/Inter_600.ttf"),
    Fraunces_500,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fbfaf9" }}>
        <ActivityIndicator size="large" color="#121212" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(salesman)" />
      </Stack>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/app/_layout.tsx && git commit -m "feat: add root layout with font loading, QueryClient, auth redirect"
```

### Task 15: Create login screen

**Files:**
- Create: `client/app/login.tsx`
- Create: `client/src/features/auth/login-form.tsx`

- [ ] **Step 1: Create login form component**

```tsx
// client/src/features/auth/login-form.tsx
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
```

- [ ] **Step 2: Create login route**

```tsx
// client/app/login.tsx
import { View } from "react-native";
import { LoginForm } from "../src/features/auth/login-form";

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fbfaf9" }}>
      <LoginForm />
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/app/login.tsx client/src/features/auth/login-form.tsx && git commit -m "feat: add login screen with Stitch-styled form and auth store integration"
```

---

## Phase 5: Admin Shell

### Task 16: Create mock data for missing dashboard endpoints

**Files:**
- Create: `client/src/lib/mockData.ts`

The server has orders/visits/shops/employees endpoints but no aggregated `/dashboard/metrics` endpoint. Mock that at the query level.

- [ ] **Step 1: Create mock data and helpers**

```ts
// client/src/lib/mockData.ts
import type { DashboardMetrics, Order } from "../types";

export const MOCK_DASHBOARD_METRICS: DashboardMetrics = {
  totalRevenue: "1250000.00",
  totalOrders: 342,
  totalVisits: 1204,
  activeSalesmen: 8,
  revenueChange: 12.5,
  ordersChange: 8.1,
  visitsChange: -3.2,
};

export const MOCK_RECENT_ORDERS: Order[] = [
  {
    id: "ord-001",
    tenantId: "t1",
    shopId: "sh-001",
    shopName: "Sharma General Store",
    salesmanId: "s1",
    salesmanName: "Ramesh Kumar",
    orderSource: "salesman",
    status: "confirmed",
    paymentStatus: "unpaid",
    totalAmount: "4500.00",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord-002",
    tenantId: "t1",
    shopId: "sh-002",
    shopName: "Patel Mart",
    salesmanId: "s2",
    salesmanName: "Suresh Singh",
    orderSource: "whatsapp",
    status: "pending_approval",
    paymentStatus: "unpaid",
    totalAmount: "3200.00",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ord-003",
    tenantId: "t1",
    shopId: "sh-003",
    shopName: "Gupta Kirana",
    salesmanId: "s1",
    salesmanName: "Ramesh Kumar",
    orderSource: "salesman",
    status: "dispatched",
    paymentStatus: "paid",
    totalAmount: "7800.00",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/mockData.ts && git commit -m "feat: add mock data for dashboard metrics and recent orders"
```

### Task 17: Create useDashboardMetrics hook (mocked)

**Files:**
- Create: `client/src/hooks/queries/useDashboardMetrics.ts`

- [ ] **Step 1: Create mocked hook**

```ts
// client/src/hooks/queries/useDashboardMetrics.ts
import { useQuery } from "@tanstack/react-query";
import { MOCK_DASHBOARD_METRICS } from "../../lib/mockData";
import type { DashboardMetrics } from "../../types";

// TODO: Swap mock for real API call when /dashboard/metrics endpoint exists
// const USE_REAL_API = false;

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      // When endpoint exists, replace with:
      // return apiClient<DashboardMetrics>("/dashboard/metrics");
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_DASHBOARD_METRICS), 600);
      });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/queries/useDashboardMetrics.ts && git commit -m "feat: add mocked useDashboardMetrics hook"
```

### Task 18: Create admin bottom tab layout

**Files:**
- Create: `client/app/(admin)/_layout.tsx`

- [ ] **Step 1: Create admin tab layout**

```tsx
// client/app/(admin)/_layout.tsx
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { View, PlatformColor } from "react-native";

export default function AdminLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf="chart.bar.fill" />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shops">
        <Icon sf="storefront.fill" />
        <Label>Shops</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf="shippingbox.fill" />
        <Label>Orders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="team">
        <Icon sf="person.2.fill" />
        <Label>Team</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf="ellipsis.circle.fill" />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

- [ ] **Step 2: Create placeholder tab screens**

```bash
mkdir -p "/Users/bhushanmalani/Code/Sales App/client/app/(admin)/shops" \
  "/Users/bhushanmalani/Code/Sales App/client/app/(admin)/orders" \
  "/Users/bhushanmalani/Code/Sales App/client/app/(admin)/team" \
  "/Users/bhushanmalani/Code/Sales App/client/app/(admin)/more"
```

```tsx
// client/app/(admin)/shops/index.tsx
import { View } from "react-native";
import { Text } from "../../../src/components/ui/text";

export default function ShopsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fbfaf9", justifyContent: "center", alignItems: "center" }}>
      <Text variant="heading" color="ash">Shops</Text>
    </View>
  );
}
```

Do the same for `orders/index.tsx`, `team/index.tsx`, `more/index.tsx` — each with appropriate tab name.

- [ ] **Step 3: Commit**

```bash
git add client/app/\(admin\)/ && git commit -m "feat: add admin bottom tab bar with NativeTabs and placeholder screens"
```

### Task 19: Create admin dashboard screen

**Files:**
- Create: `client/app/(admin)/dashboard.tsx`
- Create: `client/src/features/dashboard/metrics-grid.tsx`
- Create: `client/src/features/dashboard/recent-orders-list.tsx`

- [ ] **Step 1: Create KPI metrics grid component**

```tsx
// client/src/features/dashboard/metrics-grid.tsx
import { View } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { useDashboardMetrics } from "../../hooks/queries/useDashboardMetrics";

function MetricCard({ label, value, change }: { label: string; value: string; change: number }) {
  const isUp = change >= 0;
  return (
    <Card style={{ flex: 1, minWidth: "45%", gap: 4 }}>
      <Text variant="caption" color="ash">{label}</Text>
      <Text variant="heading" color="charcoal">{value}</Text>
      <Text variant="caption" color={isUp ? "success" : "ember"}>
        {isUp ? "+" : ""}{change}%
      </Text>
    </Card>
  );
}

export function MetricsGrid() {
  const { data } = useDashboardMetrics();

  if (!data) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
      <MetricCard label="Revenue" value={`₹${(Number(data.totalRevenue) / 100000).toFixed(1)}L`} change={data.revenueChange} />
      <MetricCard label="Orders" value={String(data.totalOrders)} change={data.ordersChange} />
      <MetricCard label="Visits" value={String(data.totalVisits)} change={data.visitsChange} />
      <MetricCard label="Active Salesmen" value={String(data.activeSalesmen)} change={0} />
    </View>
  );
}
```

- [ ] **Step 2: Create recent orders list component**

```tsx
// client/src/features/dashboard/recent-orders-list.tsx
import { View, FlatList } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";
import { MOCK_RECENT_ORDERS } from "../../lib/mockData";

const statusColors: Record<string, string> = {
  pending_approval: "#ffbb26",
  confirmed: "#0090ff",
  dispatched: "#00ca48",
  delivered: "#00ca48",
  cancelled: "#ff3e00",
};

export function RecentOrdersList() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      <Text variant="heading-sm" color="charcoal">Recent Orders</Text>
      <FlatList
        data={MOCK_RECENT_ORDERS}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label-medium" color="charcoal">{item.shopName}</Text>
                <Text variant="caption" color="ash">{item.salesmanName}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text variant="label-medium" color="charcoal">₹{item.totalAmount}</Text>
                <View style={{
                  backgroundColor: statusColors[item.status] + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                }}>
                  <Text variant="caption" color={item.status === "pending_approval" ? "warning" : item.status === "confirmed" ? "info" : "success"}>
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 3: Create dashboard screen that composes the above**

```tsx
// client/app/(admin)/dashboard.tsx
import { ScrollView, View } from "react-native";
import { Text } from "../../src/components/ui/text";
import { MetricsGrid } from "../../src/features/dashboard/metrics-grid";
import { RecentOrdersList } from "../../src/features/dashboard/recent-orders-list";

export default function DashboardScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#fbfaf9" }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ paddingTop: 60, paddingBottom: 32, gap: 32 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Text variant="display" color="charcoal">Dashboard</Text>
            <Text variant="body" color="ash">Overview of your field operations</Text>
          </View>
          <MetricsGrid />
          <RecentOrdersList />
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/app/\(admin\)/dashboard.tsx client/src/features/dashboard/ && git commit -m "feat: add admin dashboard with KPI metrics grid and recent orders list"
```

---

## Phase 6: Verification

### Task 20: Verify and iterate

- [ ] **Step 1: Check TypeScript compilation**

```bash
cd "/Users/bhushanmalani/Code/Sales App/client" && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Start Expo dev server**

```bash
cd "/Users/bhushanmalani/Code/Sales App/client" && npx expo start
```

- [ ] **Step 3: Verify login screen renders**

Open the app in Expo Go on Android/iOS simulator. Confirm:
- Login screen shows with Fraunces "FieldSales" headline
- Form fields are styled with stone inset borders
- "Sign In" button is midnight pill

- [ ] **Step 4: Test auth flow**

Enter test credentials (existing user in DB). Confirm:
- Redirect to admin dashboard on success
- Error message shows on failure
- Bottom tab bar shows 5 tabs (Dashboard, Shops, Orders, Team, More)

- [ ] **Step 5: Test admin dashboard**

With admin logged in:
- KPI cards show revenue, orders, visits, active salesmen
- Recent orders list shows 3 mock orders with status badges
- Pull-to-refresh works (no-op for now with mocks)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
