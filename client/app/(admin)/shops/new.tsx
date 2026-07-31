import { useState, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { WizardConfig } from "../../../src/components/shared";
import { Wizard } from "../../../src/components/shared";
import {
  step1ShopIdentitySchema,
  step2ShopLocationSchema,
} from "@sales-app/shared";
import {
  Step1ShopIdentity,
  Step2ShopLocation,
  ShopRegisteredSuccess,
} from "../../../src/features/shops";
import { apiClient } from "../../../src/lib/apiClient";

export default function RegisterNewShopScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [createdShop, setCreatedShop] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const createdShopRef = useRef<{ id: string; name: string } | null>(null);

  const handleAnimationComplete = useCallback(() => {
    const shop = createdShopRef.current;
    if (!shop) return;
    router.dismissTo("/(admin)/shops");
    router.push(`/(admin)/shops/${shop.id}`);
  }, [router]);

  // ---------------------------------------------------------------------------
  // Success screen (replaces the wizard upon successful submission)
  // ---------------------------------------------------------------------------
  if (createdShop) {
    return (
      <ShopRegisteredSuccess
        shopName={createdShop.name}
        shopId={createdShop.id}
        onAnimationComplete={handleAnimationComplete}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Wizard Configuration
  // ---------------------------------------------------------------------------
  const config: WizardConfig = {
    title: "Register New Shop",
    steps: [
      {
        key: "shop-identity",
        title: "Identity & Owners",
        component: Step1ShopIdentity,
        validationSchema: step1ShopIdentitySchema,
      },
      {
        key: "shop-location",
        title: "Location Details",
        component: Step2ShopLocation,
        validationSchema: step2ShopLocationSchema,
      },
    ],
    onComplete: async (data) => {
      // Compose street address, city, state, pinCode into full address string
      const fullAddress = [
        data.address,
        data.city,
        data.state,
        data.pinCode ? `PIN: ${data.pinCode}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const shop = await apiClient<{ id: string; name: string }>("/api/shops", {
        method: "POST",
        body: {
          name: data.name,
          ownerName: data.ownerName,
          phone: data.phone,
          address: fullAddress || data.address,
          imageUrl: data.imageUrl ?? null,
          additionalOwners: data.additionalOwners ?? [],
          latitude:
            data.latitude !== undefined ? Number(data.latitude) : undefined,
          longitude:
            data.longitude !== undefined ? Number(data.longitude) : undefined,
        },
      });

      // Invalidate shops cache key so newly created shop shows instantly in lists & maps
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      createdShopRef.current = { id: shop.id, name: shop.name };
      setCreatedShop({ id: shop.id, name: shop.name });
      return shop.id;
    },
    onClose: () => {
      if (createdShopRef.current) return;
      router.back();
    },
  };

  return <Wizard config={config} />;
}
