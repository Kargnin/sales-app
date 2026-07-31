import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import {
  step1ShopIdentitySchema,
  step2ShopLocationSchema,
} from "@sales-app/shared";
import { Step1ShopIdentity } from "../../features/shops/Step1ShopIdentity";
import { Step2ShopLocation } from "../../features/shops/Step2ShopLocation";

// Mock react-hook-form FormProvider wrapper helper
import { useForm, FormProvider } from "react-hook-form";

function StepWrapper({
  Component,
  initialData = {},
  onDataChange = () => {},
  fieldErrors = {},
}: {
  Component: React.FC<any>;
  initialData?: Record<string, any>;
  onDataChange?: (data: Record<string, any>) => void;
  fieldErrors?: Record<string, string>;
}) {
  const methods = useForm({ defaultValues: initialData });
  return (
    <FormProvider {...methods}>
      <Component
        initialData={initialData}
        onDataChange={onDataChange}
        fieldErrors={fieldErrors}
      />
    </FormProvider>
  );
}

describe("Register Shop Flow — State & Validation Logic", () => {
  describe("1. Step 1 Validation Schema (step1ShopIdentitySchema)", () => {
    it("validates valid step 1 data successfully", () => {
      const validData = {
        name: "SuperMart Outlet",
        ownerName: "Alice Smith",
        phone: "9876543210",
        imageUrl: "https://example.com/shop.jpg",
      };

      const result = step1ShopIdentitySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects empty shop name", () => {
      const invalidData = {
        name: "",
        ownerName: "Alice Smith",
        phone: "9876543210",
      };

      const result = step1ShopIdentitySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Shop name is required");
      }
    });

    it("rejects phone numbers that are not exactly 10 digits", () => {
      const invalidData = {
        name: "SuperMart Outlet",
        ownerName: "Alice Smith",
        phone: "123", // invalid
      };

      const result = step1ShopIdentitySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Phone number must be exactly 10 digits",
        );
      }
    });
    it("validates step 1 with optional additional owners array", () => {
      const validData = {
        name: "SuperMart Outlet",
        ownerName: "Alice Smith",
        phone: "9876543210",
        additionalOwners: [{ name: "Bob Partner", phone: "9876543211" }],
      };

      const result = step1ShopIdentitySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("2. Step 2 Validation Schema (step2ShopLocationSchema)", () => {
    it("validates valid step 2 location data successfully", () => {
      const validData = {
        address: "123 Main Street, Suite 4B",
        city: "Mumbai",
        state: "MH",
        pinCode: "400001",
        latitude: 19.076,
        longitude: 72.8777,
      };

      const result = step2ShopLocationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects empty street address, PIN Code, city, or state", () => {
      const invalidData = {
        address: "",
        pinCode: "",
        city: "",
        state: "",
      };

      const result = step2ShopLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain("Street address is required");
        expect(messages).toContain("PIN Code is required");
        expect(messages).toContain("City is required");
        expect(messages).toContain("State is required");
      }
    });

    it("rejects invalid non-6-digit PIN code", () => {
      const invalidData = {
        address: "123 Main St",
        pinCode: "123", // invalid
        city: "Mumbai",
        state: "MH",
      };

      const result = step2ShopLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "PIN Code must be a 6-digit number",
        );
      }
    });
  });

  describe("3. Step Component Render Tests", () => {
    it("renders Step 1 (Shop Identity & Owners) fields and Add Owner button", async () => {
      await render(
        <StepWrapper
          Component={Step1ShopIdentity}
          initialData={{ name: "Corner Store", phone: "9876543210" }}
        />,
      );

      expect(screen.getByText("Shop Identity")).toBeTruthy();
      expect(screen.getByText("Primary Owner")).toBeTruthy();
      expect(screen.getByText("Phone Number")).toBeTruthy();
      expect(screen.getByText("Add Owner")).toBeTruthy();
    });

    it("renders Step 2 (Location Details) fields & GPS Auto-Fill button", async () => {
      await render(
        <StepWrapper
          Component={Step2ShopLocation}
          initialData={{ address: "456 Side Ave" }}
        />,
      );

      expect(screen.getByText("Location Details")).toBeTruthy();
      expect(screen.getByText("Street Address")).toBeTruthy();
      expect(screen.getByText("City")).toBeTruthy();
      expect(screen.getByText("State")).toBeTruthy();
      expect(screen.getByText("PIN Code")).toBeTruthy();
      expect(screen.getByText("Open Full Map")).toBeTruthy();
    });
  });
});
