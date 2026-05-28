import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sales_app_starred_shops';

export function useFavorites() {
  const [starredIds, setStarredIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStarredIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading starred shops:', e);
    }
  }, []);

  const toggleFavorite = useCallback((shopId: string) => {
    setStarredIds((prev) => {
      let updated: string[];
      if (prev.includes(shopId)) {
        updated = prev.filter((id) => id !== shopId);
      } else {
        updated = [...prev, shopId];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving starred shops:', e);
      }
      return updated;
    });
  }, []);

  const isFavorited = useCallback(
    (shopId: string) => starredIds.includes(shopId),
    [starredIds]
  );

  return {
    starredIds,
    toggleFavorite,
    isFavorited,
  };
}
