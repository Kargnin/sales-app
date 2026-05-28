import {
  useProducts as useProductsQuery,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './queries/useProductsQuery.js';

export function useProducts() {
  const { data: products = [], isLoading } = useProductsQuery();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function getFilteredProducts(search: string) {
    if (!search.trim()) return products;
    const q = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }

  return {
    products,
    isLoading,
    fetchProducts: () => {},
    addProduct: createProduct.mutateAsync,
    editProduct: (productId: string, data: any) => updateProduct.mutateAsync({ productId, data }),
    deleteProduct: deleteProduct.mutateAsync,
    getFilteredProducts,
  };
}

export { useProduct, useCreateProduct, useUpdateProduct, useDeleteProduct };
