import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { ShopMapView } from "../../../features/shops/ShopMapView";
import type { Shop } from "../../../types";

// Mock shops
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

describe("ShopMapView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders the map view container", async () => {
    await render(<ShopMapView shops={mockShops} onShopPress={jest.fn()} />);

    expect(screen.getByTestId("shop-map-view")).toBeTruthy();
  });

  it("renders the map canvas", async () => {
    await render(<ShopMapView shops={mockShops} onShopPress={jest.fn()} />);

    expect(screen.getByTestId("shop-map-canvas")).toBeTruthy();
  });

  it("renders the bottom sheet drawer", async () => {
    await render(<ShopMapView shops={mockShops} onShopPress={jest.fn()} />);

    expect(screen.getByTestId("shop-bottom-sheet")).toBeTruthy();
  });

  // ── Shop Selection Behavior ────────────────────────────────────────────

  it("allows selecting a shop other than the first one", async () => {
    await render(<ShopMapView shops={mockShops} onShopPress={jest.fn()} />);

    const shop2Item = screen.getByTestId("shop-item-shop-2");
    expect(shop2Item).toBeTruthy();

    await act(async () => {
      fireEvent.press(shop2Item);
    });

    // Both shops should still exist after selection
    expect(screen.getByTestId("shop-item-shop-2")).toBeTruthy();
    expect(screen.getByTestId("shop-item-shop-1")).toBeTruthy();
  });

  it("maintains shop items after selecting different shops", async () => {
    await render(<ShopMapView shops={mockShops} onShopPress={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("shop-item-shop-2"));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("shop-item-shop-3"));
    });

    expect(screen.getByTestId("shop-item-shop-1")).toBeTruthy();
    expect(screen.getByTestId("shop-item-shop-2")).toBeTruthy();
    expect(screen.getByTestId("shop-item-shop-3")).toBeTruthy();
  });

  // ── Bottom Sheet Interaction ──────────────────────────────────────────

  it("renders all shop items in the bottom sheet", async () => {
    await render(<ShopMapView shops={mockShops} onShopPress={jest.fn()} />);

    expect(screen.getByTestId("shop-item-shop-1")).toBeTruthy();
    expect(screen.getByTestId("shop-item-shop-2")).toBeTruthy();
    expect(screen.getByTestId("shop-item-shop-3")).toBeTruthy();
  });

  // ── onShopPress callback ──────────────────────────────────────────────

  it("calls onShopPress when a shop detail button is pressed", async () => {
    const onShopPress = jest.fn();

    await render(<ShopMapView shops={mockShops} onShopPress={onShopPress} />);

    const detailsBtn = screen.getByTestId("shop-details-btn-shop-1");
    await act(async () => {
      fireEvent.press(detailsBtn);
    });

    expect(onShopPress).toHaveBeenCalledWith(mockShops[0]);
  });

  // ── onPlaceOrder callback ─────────────────────────────────────────────

  it("calls onPlaceOrder when place order button is pressed", async () => {
    const onPlaceOrder = jest.fn();

    await render(
      <ShopMapView
        shops={mockShops}
        onShopPress={jest.fn()}
        onPlaceOrder={onPlaceOrder}
      />,
    );

    const actionBtn = screen.getByTestId("shop-action-btn-shop-1");
    await act(async () => {
      fireEvent.press(actionBtn);
    });

    expect(onPlaceOrder).toHaveBeenCalledWith(mockShops[0]);
  });

  // ── Empty shops ───────────────────────────────────────────────────────

  it("renders without crashing with empty shops array", async () => {
    await render(<ShopMapView shops={[]} onShopPress={jest.fn()} />);

    expect(screen.getByTestId("shop-map-view")).toBeTruthy();
  });

  // ── Shops without coordinates ─────────────────────────────────────────

  it("renders with shops that have no lat/lng coordinates", async () => {
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

    await render(<ShopMapView shops={shopsNoCoords} onShopPress={jest.fn()} />);

    expect(screen.getByTestId("shop-map-view")).toBeTruthy();
    expect(screen.getByTestId("shop-item-shop-nocoord")).toBeTruthy();
  });
});
