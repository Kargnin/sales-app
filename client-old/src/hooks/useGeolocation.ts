import { useState, useCallback } from 'react';

interface Coords {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getDeviceCoords = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCurrentCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => console.error('Error reading geolocation:', error)
    );
  }, []);

  const captureGps = useCallback((): Promise<Coords> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: parseFloat(position.coords.latitude.toFixed(8)),
            longitude: parseFloat(position.coords.longitude.toFixed(8)),
          };
          setCurrentCoords(coords);
          setIsLoading(false);
          resolve(coords);
        },
        (error) => {
          setIsLoading(false);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const getProximityMeters = useCallback(
    (targetLat: number, targetLon: number): number => {
      if (!currentCoords) return Infinity;
      return haversineDistance(
        currentCoords.latitude,
        currentCoords.longitude,
        targetLat,
        targetLon
      );
    },
    [currentCoords]
  );

  const getDistanceString = useCallback(
    (targetLat: number, targetLon: number): string => {
      if (!currentCoords) return 'Unknown';
      const d = haversineDistance(
        currentCoords.latitude,
        currentCoords.longitude,
        targetLat,
        targetLon
      );
      return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
    },
    [currentCoords]
  );

  return {
    currentCoords,
    isLoading,
    getDeviceCoords,
    captureGps,
    getProximityMeters,
    getDistanceString,
  };
}

// Haversine formula — returns distance in meters between two lat/lon points.
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
