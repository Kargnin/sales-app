import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ShopBottomSheetItem } from "../../../features/shops/components/ShopBottomSheetItem";
import type { Shop } from "../../../types";

const mockApprovedShop: Shop = {
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
};

const mockPendingShop: Shop = {
  id: "shop-2",
  tenantId: "tenant-1",
  name: "Corner Bakery",
  ownerName: "Jane Smith",
  phone: "+1987654321",
  address: "456 Main Rd",
  latitude: "19.0800",
  longitude: "72.8800",
  status: "pending_approval",
  createdAt: "2026-01-02T00:00:00Z",
};

describe("ShopBottomSheetItem", () => {
  it("renders shop name, owner, and address", async () => {
    await render(
      <ShopBottomSheetItem
        shop={mockApprovedShop}
        onSelect={jest.fn()}
        onShopPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Apex Electronics")).toBeTruthy();
    expect(screen.getByText("Owner: John Doe")).toBeTruthy();
    expect(screen.getByText("📍 123 Tech Street")).toBeTruthy();
  });

  it("does not show Pending badge for approved shop", async () => {
    await render(
      <ShopBottomSheetItem
        shop={mockApprovedShop}
        onSelect={jest.fn()}
        onShopPress={jest.fn()}
      />,
    );

    expect(screen.queryByText("Pending Approval")).toBeNull();
  });

  it("shows Pending Approval badge and Review Approval button for pending shop", async () => {
    await render(
      <ShopBottomSheetItem
        shop={mockPendingShop}
        onSelect={jest.fn()}
        onShopPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Pending Approval")).toBeTruthy();
    expect(screen.getByText("Review Approval")).toBeTruthy();
  });

  it("calls onSelect when shop item card is pressed", async () => {
    const onSelect = jest.fn();
    await render(
      <ShopBottomSheetItem
        shop={mockApprovedShop}
        onSelect={onSelect}
        onShopPress={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("shop-item-shop-1"));
    expect(onSelect).toHaveBeenCalledWith(mockApprovedShop);
  });

  it("calls onPlaceOrder when action button is pressed", async () => {
    const onPlaceOrder = jest.fn();
    await render(
      <ShopBottomSheetItem
        shop={mockApprovedShop}
        onSelect={jest.fn()}
        onShopPress={jest.fn()}
        onPlaceOrder={onPlaceOrder}
      />,
    );

    fireEvent.press(screen.getByTestId("shop-action-btn-shop-1"));
    expect(onPlaceOrder).toHaveBeenCalledWith(mockApprovedShop);
  });
});
