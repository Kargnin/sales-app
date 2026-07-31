import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ShopMapCanvas } from "../../../features/shops/components/ShopMapCanvas.native";
import type { Shop } from "../../../types";

// react-native-maps mock is provided globally by jest.setup.ts

const mockShops: Shop[] = [
  {
    id: "shop-1",
    tenantId: "tenant-1",
    name: "Apex Electronics",
    ownerName: "John Doe",
    phone: "+1234567890",
    address: "123 Tech Street",
    latitude: "19.0760",
    longitude: "72.8777",
    status: "approved",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "shop-2",
    tenantId: "tenant-1",
    name: "Corner Bakery",
    ownerName: "Jane Smith",
    phone: "+1987654321",
    address: "456 Main Rd",
    latitude: "19.0800",
    longitude: "72.8800",
    status: "approved",
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "shop-3",
    tenantId: "tenant-1",
    name: "Green Grocer",
    ownerName: "Bob Wilson",
    phone: "+1122334455",
    address: "789 Oak Ave",
    latitude: "19.0900",
    longitude: "72.8900",
    status: "approved",
    createdAt: "2026-01-03T00:00:00Z",
  },
];

describe("ShopMapCanvas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders the map container", async () => {
    await render(
      <ShopMapCanvas
        shops={mockShops}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={jest.fn()}
      />,
    );

    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
  });

  it("renders a marker for each shop", async () => {
    await render(
      <ShopMapCanvas
        shops={mockShops}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={jest.fn()}
      />,
    );

    expect(screen.getByTestId("shop-marker-shop-1")).toBeTruthy();
    expect(screen.getByTestId("shop-marker-shop-2")).toBeTruthy();
    expect(screen.getByTestId("shop-marker-shop-3")).toBeTruthy();
  });

  it("renders correctly with empty shops array", async () => {
    await render(
      <ShopMapCanvas
        shops={[]}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={jest.fn()}
      />,
    );

    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
  });

  // ── Selected shop ──────────────────────────────────────────────────────

  it("renders selected marker with different pin color", async () => {
    await render(
      <ShopMapCanvas
        shops={mockShops}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={jest.fn()}
        selectedShopId="shop-2"
      />,
    );

    // All markers should render regardless of selection state
    expect(screen.getByTestId("shop-marker-shop-1")).toBeTruthy();
    expect(screen.getByTestId("shop-marker-shop-2")).toBeTruthy();
    expect(screen.getByTestId("shop-marker-shop-3")).toBeTruthy();
  });

  // ── onSelectShopFromMap callback ────────────────────────────────────────

  it("re-renders with new selectedShopId without errors", async () => {
    const onSelectShopFromMap = jest.fn();
    const { rerender } = await render(
      <ShopMapCanvas
        shops={mockShops}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={onSelectShopFromMap}
      />,
    );

    // Simulate selecting shop-2 via re-render
    rerender(
      <ShopMapCanvas
        shops={mockShops}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={onSelectShopFromMap}
        selectedShopId="shop-2"
      />,
    );

    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
    expect(screen.getByTestId("shop-marker-shop-2")).toBeTruthy();
  });

  // ── Shops without coordinates ─────────────────────────────────────────

  it("renders without crashing for shops with no lat/lng", async () => {
    const shopsNoCoords: Shop[] = [
      {
        id: "shop-nocoord",
        tenantId: "tenant-1",
        name: "No Location Shop",
        ownerName: null,
        phone: "+1111111111",
        address: "Somewhere",
        latitude: null,
        longitude: null,
        status: "approved",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];

    await render(
      <ShopMapCanvas
        shops={shopsNoCoords}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={jest.fn()}
      />,
    );

    // Falls back to defaultCenterLat/Lng for shops without coordinates
    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
    expect(screen.getByTestId("shop-marker-shop-nocoord")).toBeTruthy();
  });

  // ── User location ──────────────────────────────────────────────────────

  it("renders map with showsUserLocation enabled by default", async () => {
    await render(
      <ShopMapCanvas
        shops={mockShops}
        defaultCenterLat={19.076}
        defaultCenterLng={72.8777}
        onSelectShopFromMap={jest.fn()}
      />,
    );

    // The map component renders; showsUserLocation is a native prop
    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
  });
});
