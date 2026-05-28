After any code changes:
1. Make sure there are no typescript compilation errors
2. Make sure the server + client code builds and runs without any issues

Always first check the best way to structure a role-based UI component when a component is used/rendered in multiple roles.

Search the web for best practices for both server as well as client side.

Always think about the structure/low-level design of a component first, extract out common rendering components, just pass the input data for the component to render, keep the business logic separate from UI.

We should be able to change UI components easily without affecting the application.

Target: React Native + Expo with Expo Router for both iOS and Android (Android primary).

Use Expo and React Native related skills whenever possible.

For UI design use Stitch MCP to fetch app page designs.

Stitch project ID: 2048573934882273867