import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Shop } from '../../stores/appStore.js';

interface ShopMapProps {
  shops: Shop[];
  userCoords: { latitude: number; longitude: number } | null;
  selectedShopId: string | null;
  onSelectShop: (shopId: string) => void;
}

export const ShopMap: React.FC<ShopMapProps> = ({
  shops,
  userCoords,
  selectedShopId,
  onSelectShop,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const proximityCircleRef = useRef<L.Circle | null>(null);
  
  // Custom marker maps to store outlet markers for easy activation
  const outletMarkersRef = useRef<Record<string, L.Marker>>({});

  // 1. Initialize map container once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center to Mumbai/Sharma store if no userCoords are available
    const initialCenter: L.LatLngExpression = userCoords 
      ? [userCoords.latitude, userCoords.longitude] 
      : [19.0760, 72.8777];

    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // Position standard zoom controls customly
      attributionControl: false,
    }).setView(initialCenter, 12);

    // Render gorgeous, high-contrast flat CartoDB Dark Matter map tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Position Zoom control at bottom right to prevent cluttering the top floating bar
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    markerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      // Cleanup map instance properly on unmount to release resources
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Synchronize user's live position (Blue GPS dot & Proximity range ring)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) return;

    const userLatLng: L.LatLngExpression = [userCoords.latitude, userCoords.longitude];

    // Pulsing blue GPS indicator (matches Apple Maps/Google maps feel)
    const userLocationIcon = L.divIcon({
      className: 'custom-gps-user-marker',
      html: `
        <div class="relative flex items-center justify-center size-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
          <span class="relative inline-flex rounded-full size-3 bg-sky-500 border-2 border-white shadow-lg"></span>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
    } else {
      userMarkerRef.current = L.marker(userLatLng, { icon: userLocationIcon }).addTo(map);
    }

    // Proximity 200m check-in radius ring
    if (proximityCircleRef.current) {
      proximityCircleRef.current.setLatLng(userLatLng);
    } else {
      proximityCircleRef.current = L.circle(userLatLng, {
        radius: 200, // 200 meters Proximity Radius
        color: 'rgba(56, 189, 248, 0.4)',
        fillColor: 'rgba(56, 189, 248, 0.1)',
        fillOpacity: 0.15,
        weight: 1,
        stroke: true,
      }).addTo(map);
    }
  }, [userCoords]);

  // 3. Render and synchronize Shop Outlets
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    // Clear previous outlets markers to re-render fresh
    markerGroup.clearLayers();
    outletMarkersRef.current = {};

    const bounds: L.LatLngTuple[] = [];

    shops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;
      
      const shopLat = parseFloat(shop.latitude);
      const shopLng = parseFloat(shop.longitude);
      const shopLatLng: L.LatLngExpression = [shopLat, shopLng];
      
      bounds.push([shopLat, shopLng]);

      const isSelected = selectedShopId === shop.id;

      // Custom Airbnb-style tag pin: highly visible lime-green capsule
      const outletIcon = L.divIcon({
        className: `custom-outlet-map-pin-${shop.id}`,
        html: `
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-md active:scale-95 transition-all duration-200 ${
            isSelected 
              ? 'bg-[#c2fce7] text-[#090d0a] border-emerald-300 font-extrabold scale-110 shadow-emerald-500/20' 
              : 'bg-[#e1fd52] text-[#090d0a] border-black/10 font-bold hover:scale-105'
          }">
            <span class="text-sm shrink-0">🏪</span>
            <span class="text-[11px] uppercase tracking-wide truncate max-w-[85px]">${shop.name}</span>
          </div>
        `,
        iconSize: [120, 32],
        iconAnchor: [60, 16],
      });

      const marker = L.marker(shopLatLng, { icon: outletIcon })
        .on('click', () => {
          map.setView(shopLatLng, 15, { animate: true });
          onSelectShop(shop.id);
        })
        .addTo(markerGroup);

      outletMarkersRef.current[shop.id] = marker;
    });

    // Fit bounds automatically to capture all outlets + user live position nicely
    if (bounds.length > 0) {
      if (userCoords) {
        bounds.push([userCoords.latitude, userCoords.longitude]);
      }
      
      // Auto zoom-fit ensuring high quality margins
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }, [shops, selectedShopId]);

  // 4. Center map automatically when a shop is selected from the sidebar/list
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedShopId) return;

    const selectedShop = shops.find((s) => s.id === selectedShopId);
    if (selectedShop && selectedShop.latitude && selectedShop.longitude) {
      const lat = parseFloat(selectedShop.latitude);
      const lng = parseFloat(selectedShop.longitude);
      map.setView([lat, lng], 15, { animate: true });
    }
  }, [selectedShopId]);

  return (
    <div className="relative w-full h-full min-h-[450px] overflow-hidden rounded-3xl border border-[#17221b] shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating map ambient compass grid lines details */}
      <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-slate-950/80 backdrop-blur-md border border-white/5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none select-none">
        Compass Layer Active
      </div>
    </div>
  );
};
