import { useState, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { WizardConfig } from "../../../src/components/shared";
import { Wizard } from "../../../src/components/shared";
import { step1BasicInfoSchema, step2PricingSchema } from "@sales-app/shared";
import { Step1BasicInfo } from "../../../src/features/products/Step1BasicInfo";
import { Step2Pricing } from "../../../src/features/products/Step2Pricing";
import { ProductAddedSuccess } from "../../../src/features/products/ProductAddedSuccess";
import { apiClient } from "../../../src/lib/apiClient";

export default function NewProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [createdProduct, setCreatedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const createdProductRef = useRef<{ id: string; name: string } | null>(null);

  const handleAnimationComplete = useCallback(() => {
    const product = createdProductRef.current;
    if (!product) return;
    router.dismissTo("/(admin)/products");
    router.push(`/(admin)/products/${product.id}`);
  }, [router]);

  // ---------------------------------------------------------------------------
  // Success screen (replaces the wizard)
  // ---------------------------------------------------------------------------
  if (createdProduct) {
    return (
      <ProductAddedSuccess
        productName={createdProduct.name}
        productId={createdProduct.id}
        onAnimationComplete={handleAnimationComplete}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Wizard
  // ---------------------------------------------------------------------------
  const config: WizardConfig = {
    title: "Add New Product",
    steps: [
      {
        key: "basic-info",
        title: "Basic Info & Category",
        component: Step1BasicInfo,
        validationSchema: step1BasicInfoSchema,
      },
      {
        key: "pricing",
        title: "Price & Media",
        component: Step2Pricing,
        validationSchema: step2PricingSchema,
      },
    ],
    onComplete: async (data) => {
      const product = await apiClient<{ id: string; name: string }>(
        "/api/products",
        {
          method: "POST",
          body: {
            name: data.name,
            description: data.description,
            category: data.category,
            price: Number(data.price),
            unit: data.unit,
            imageUrl: data.imageUri,
          },
        },
      );
      // Invalidate the catalog cache so the new product appears without refresh
      queryClient.invalidateQueries({ queryKey: ["products"] });
      createdProductRef.current = { id: product.id, name: product.name };
      setCreatedProduct({ id: product.id, name: product.name });
      return product.id;
    },
    onClose: () => {
      // When a product was just created we must NOT call router.back() —
      // the success animation screen is about to render and will handle
      // navigation via router.replace.
      if (createdProductRef.current) return;
      router.back();
    },
  };

  return <Wizard config={config} />;
}
