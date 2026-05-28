# ADR 0001: React Native + Expo over Ionic + Capacitor

## Status

Accepted (2026-05-28)

## Context

The client application was originally built with React + Tailwind + Ionic + Capacitor, targeting iOS and Android via a WebView bridge. The team encountered performance and customization limitations inherent to the WebView approach, particularly around:
- Android-first responsiveness (the primary target platform)
- Native-feeling navigation transitions and bottom tabs
- Offline reliability on low-end devices
- Daylight visibility and touch-target fidelity in bright field environments

## Decision

Migrate the client from Ionic/Capacitor to React Native with Expo (Expo Router, Expo SDK).

## Rationale

1. **Android-first**: React Native renders to native views, not a WebView. This eliminates the WebView bridge overhead and gives true native scroll performance, touch handling, and platform-specific behavior that Capacitor can only emulate.
2. **Expo ecosystem**: Expo provides managed native modules (secure storage, image, fonts, haptics), OTA updates via EAS, and a mature build pipeline — reducing the devops burden compared to bare Capacitor.
3. **Expo Router**: File-based routing with built-in deep linking, layout groups for role-based navigation, and typed routes — a cleaner pattern than the React Router v7 + Ionic guard component workaround in the old codebase.
4. **Styling**: NativeWind v5 provides a Tailwind-like utility styling experience on React Native, preserving the team's existing styling workflow.
5. **Design fidelity**: The "Warm Tactile Industrial" Stitch design system (stone inset borders, tonal layering, pill-shaped CTAs) maps better to native rendering than WebView approximation.

## Consequences

- **Positive**: Native navigation, better Android performance, Expo's managed workflow, typed routes
- **Negative**: The old `client/` directory becomes legacy code. Some Ionic-specific UI patterns need redesign. Existing Capacitor-native plugins (local notifications, splash screen) must be replaced with Expo equivalents.
- **Neutral**: The server API is unchanged. Zustand + TanStack Query business logic ports over with minimal changes.

## Alternatives considered

- **Stay on Ionic + Capacitor**: Simpler short-term but doesn't solve the performance and customization issues driving this decision.
- **Flutter**: Strong Android performance but requires learning Dart and rebuilding the entire component tree — higher migration cost than React Native given the team's React expertise.
