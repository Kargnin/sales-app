import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ShopDetailScreen from "../../../../app/(admin)/shops/[id]";
import type { Shop } from "../../../types";

const mockShopData: Shop = {
  id: "shop-123",
  tenantId: "tenant-1",
  name: "Apex Super Store",
  ownerName: "Alice Walker",
  phone: "9876543210",
  address: "123 Commercial St, Mumbai, PIN: 400001",
  imageUrl: "https://example.com/store.jpg",
  additionalOwners: JSON.stringify([
    { name: "Bob Walker", phone: "9876543211" },
  ]),
  latitude: "19.0760",
  longitude: "72.8777",
  status: "approved",
  createdAt: "2026-01-01T00:00:00Z",
};

jest.mock("../../../hooks/queries/useShops", () => ({
  useShop: jest.fn(() => ({
    data: mockShopData,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("../../../stores/authStore", () => ({
  useAuthStore: jest.fn((selector) =>
    selector({
      user: { role: "admin", id: "admin-1", tenantId: "tenant-1" },
    }),
  ),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "shop-123" }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
}));

describe("ShopDetailScreen", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("renders shop view mode with details and quick actions", async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <ShopDetailScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Apex Super Store")).toBeTruthy();
    expect(screen.getByText("Alice Walker")).toBeTruthy();
    expect(screen.getByText("9876543210")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.getByText("Call Owner")).toBeTruthy();
    expect(screen.getByText("WhatsApp")).toBeTruthy();
    expect(screen.getByText("Directions")).toBeTruthy();
    expect(screen.getByText("Create Order for Outlet")).toBeTruthy();
  });

  it("renders co-owners list correctly", async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <ShopDetailScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Bob Walker (9876543211)")).toBeTruthy();
  });

  it("renders store location map preview", async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <ShopDetailScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
  });
});
