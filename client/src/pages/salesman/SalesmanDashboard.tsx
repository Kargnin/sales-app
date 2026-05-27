import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAuthStore } from '../../stores/authStore.js';
import { useAppStore } from '../../stores/appStore.js';
import { useOfflineStore } from '../../stores/offlineStore.js';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createShopSchema } from '@sales-app/shared';
import { cn } from '@/lib/utils';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { 
  Store, MapPin, ShoppingCart, PlusCircle, Navigation2, Search, SlidersHorizontal, 
  Map as MapIcon, List as ListIcon, Star, Calendar, RefreshCw,
  Plus, ArrowLeft, ArrowUpDown, ChevronRight, Package, IndianRupee,
  CheckCircle2, Clock
} from 'lucide-react';
import { ShopTile } from '../../components/salesman/ShopTile.js';
import { ShopMap } from '../../components/salesman/ShopMap.js';
import { SwipeableTabs } from '@/components/ui/SwipeableTabs';
import { SwipeableContainer } from '@/components/ui/SwipeableContainer';
import { PaginatedList } from '../../components/ui/PaginatedList.js';
import { Visit, Order } from '../../stores/appStore.js';

export const SalesmanDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    shops, fetchShops, addShop, isLoadingShops, products, fetchProducts, 
    addOrder, addVisit, visits, fetchVisits, orders, fetchOrders 
  } = useAppStore();
  const { isOnline, queue, syncQueue } = useOfflineStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const mobileTab = (searchParams.get('tab') as 'shops' | 'register' | 'orders' | 'visits') || 'shops';

  const salesmanTabs: Array<'shops' | 'orders' | 'visits'> = ['shops', 'orders', 'visits'];

  const prevTabRef = React.useRef<string>(mobileTab);
  const [swipeDirection, setSwipeDirection] = React.useState<'right' | 'left' | null>(null);

  React.useEffect(() => {
    if (mobileTab !== prevTabRef.current) {
      const prevIndex = salesmanTabs.indexOf(prevTabRef.current as any);
      const newIndex = salesmanTabs.indexOf(mobileTab as any);
      if (prevIndex !== -1 && newIndex !== -1) {
        setSwipeDirection(newIndex > prevIndex ? 'right' : 'left');
      }
      prevTabRef.current = mobileTab;
    }
  }, [mobileTab]);

  const swipeClass = swipeDirection === 'right' 
    ? 'animate-tab-right' 
    : swipeDirection === 'left' 
    ? 'animate-tab-left' 
    : '';

  const handleSwipeLeft = () => {
    const currentIndex = salesmanTabs.indexOf(mobileTab as any);
    if (currentIndex !== -1 && currentIndex < salesmanTabs.length - 1) {
      setSearchParams({ tab: salesmanTabs[currentIndex + 1] });
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = salesmanTabs.indexOf(mobileTab as any);
    if (currentIndex !== -1 && currentIndex > 0) {
      setSearchParams({ tab: salesmanTabs[currentIndex - 1] });
    }
  };

  // URL-driven reactive filters
  const filterShopParam = searchParams.get('filter_shop') || '';
  const shopIdParam = searchParams.get('shopId') || '';

  const activeShop = useMemo(() => {
    return shops.find(s => 
      (shopIdParam && s.id === shopIdParam) || 
      (filterShopParam && s.name.toLowerCase() === filterShopParam.toLowerCase())
    );
  }, [shops, shopIdParam, filterShopParam]);

  const filteredVisits = useMemo(() => {
    let result = visits.filter(v => v.salesmanId === user?.id);
    if (activeShop) {
      result = result.filter(v => v.shopId === activeShop.id);
    }
    return result.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
  }, [visits, activeShop, user?.id]);

  // Swipeable & Filterable Orders tab states
  const [orderTab, setOrderTab] = useState<'all' | 'ongoing' | 'delivered'>('all');
  const [orderSort, setOrderSort] = useState<'date_desc' | 'date_asc' | 'shop_asc' | 'shop_desc' | 'value_asc' | 'value_desc'>('date_desc');

  const ordersFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (shopIdParam) filters.shopId = shopIdParam;
    if (filterShopParam) filters.filter_shop = filterShopParam;
    if (orderTab) filters.status = orderTab;
    if (orderSort) filters.sort = orderSort;
    return filters;
  }, [shopIdParam, filterShopParam, orderTab, orderSort]);

  const visitsFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (shopIdParam) filters.shopId = shopIdParam;
    if (filterShopParam) filters.filter_shop = filterShopParam;
    return filters;
  }, [shopIdParam, filterShopParam]);

  // Redesign UI States
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'starred' | 'near_me' | 'recent' | 'pending'>('all');
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Mobile bottom swipable drawer state for map sheet (0 = collapsed, 1 = partially visible, 2 = fully expanded)
  const [mapSheetState, setMapSheetState] = useState<'collapsed' | 'peek' | 'expanded'>('peek');

  // Drawer States
  const [selectedShopId, setSelectedShopId] = useState('');
  const [isCheckinDrawerOpen, setIsCheckinDrawerOpen] = useState(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  // Check-in State
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [coordsMock, setCoordsMock] = useState<string | null>(null);

  // Order State
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);

  // Registration State
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: '', ownerName: '', phone: '', address: '',
      latitude: 0, longitude: 0,
    },
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncQueue();
    setIsSyncing(false);
  };

  const getDeviceCoords = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => console.error('Error reading geolocation:', error)
      );
    }
  };

  // Load Starred shop IDs and full history from local storage
  useEffect(() => {
    fetchShops();
    fetchProducts();
    fetchVisits();
    fetchOrders();
    getDeviceCoords();

    try {
      const stored = localStorage.getItem('sales_app_starred_shops');
      if (stored) {
        setStarredIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading starred shops:', e);
    }
  }, []);

  const handleToggleFavorite = (shopId: string) => {
    try {
      let updated: string[];
      if (starredIds.includes(shopId)) {
        updated = starredIds.filter(id => id !== shopId);
        toast.success('Outlet removed from starred list');
      } else {
        updated = [...starredIds, shopId];
        toast.success('Outlet added to starred list! 🌟');
      }
      setStarredIds(updated);
      localStorage.setItem('sales_app_starred_shops', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving starred shops:', e);
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by your browser.');
    setIsCapturingGps(true);
    const toastId = toast.loading('Querying GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', parseFloat(position.coords.latitude.toFixed(8)));
        setValue('longitude', parseFloat(position.coords.longitude.toFixed(8)));
        toast.dismiss(toastId);
        toast.success('Successfully acquired GPS coordinates!');
        setIsCapturingGps(false);
      },
      (error) => {
        toast.dismiss(toastId);
        toast.error(`GPS acquisition failed: ${error.message}`);
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleUseMockGps = () => {
    setValue('latitude', parseFloat((18.9750 + (Math.random() - 0.5) * 0.05).toFixed(8)));
    setValue('longitude', parseFloat((72.8258 + (Math.random() - 0.5) * 0.05).toFixed(8)));
    toast.success('Mock GPS coordinates set');
  };

  const incrementQty = (prodId: string) => setOrderQuantities((prev) => ({ ...prev, [prodId]: (prev[prodId] || 0) + 1 }));
  const decrementQty = (prodId: string) => setOrderQuantities((prev) => ({ ...prev, [prodId]: Math.max(0, (prev[prodId] || 0) - 1) }));
  
  const calculateTotal = () => {
    return products.reduce((total, prod) => total + (orderQuantities[prod.id] || 0) * parseFloat(prod.price), 0).toFixed(2);
  };

  function getProximityDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d;
  }

  const getDistanceString = (shop: any) => {
    if (!currentCoords || !shop.latitude || !shop.longitude) return 'Unknown';
    const d = getProximityDistance(currentCoords.latitude, currentCoords.longitude, parseFloat(shop.latitude), parseFloat(shop.longitude));
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  };

  // Proximity helper in meters for filters
  const getProximityMeters = (shop: any): number => {
    if (!currentCoords || !shop.latitude || !shop.longitude) return Infinity;
    return getProximityDistance(currentCoords.latitude, currentCoords.longitude, parseFloat(shop.latitude), parseFloat(shop.longitude));
  };

  const handleGpsCheckin = () => {
    setIsGpsLoading(true); setCheckinSuccess(false); setCheckinError(null); setCoordsMock(null);
    if (!navigator.geolocation) {
      setIsGpsLoading(false);
      return toast.error('Geolocation is not supported.');
    }
    const toastId = toast.loading('Locking GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordsMock(`lat ${latitude.toFixed(6)} · lon ${longitude.toFixed(6)}`);
        try {
          const visit = await addVisit({ shopId: selectedShopId, latitude, longitude, notes: 'Mobile check-in' });
          setIsGpsLoading(false);
          toast.dismiss(toastId);
          if (visit.gpsVerified) {
            toast.success('Check-in recorded! GPS Verified on-site.');
            setCheckinSuccess(true);
            fetchVisits();
          } else {
            toast.warning('Check-in recorded, but out-of-proximity!');
            setCheckinSuccess(true);
            fetchVisits();
          }
        } catch (err: any) {
          setIsGpsLoading(false); toast.dismiss(toastId);
          let errorMsg = err.response?.data?.error || 'Failed check-in';
          if (err.response?.data?.details) {
            const details = err.response.data.details;
            const formattedDetails = Object.entries(details)
              .map(([key, val]: any) => {
                const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
                const errors = val._errors?.join(', ') || '';
                return `${fieldName}: ${errors}`;
              })
              .join('\n- ');
            errorMsg = `Validation failed:\n- ${formattedDetails}`;
          }
          setCheckinError(errorMsg);
          toast.error(errorMsg);
        }
      },
      (error) => {
        setIsGpsLoading(false); toast.dismiss(toastId);
        const errorMsg = `GPS coords lock failed: ${error.message}`;
        setCheckinError(errorMsg);
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMockCheckin = async () => {
    setIsGpsLoading(true); setCheckinSuccess(false); setCheckinError(null); setCoordsMock(null);
    const shop = shops.find((s) => s.id === selectedShopId);
    if (!shop) return;
    
    const latitude = parseFloat(shop.latitude || '18.9750');
    const longitude = parseFloat(shop.longitude || '72.8258');
    setCoordsMock(`[MOCK] lat ${latitude.toFixed(6)} · lon ${longitude.toFixed(6)}`);

    try {
      const visit = await addVisit({ shopId: selectedShopId, latitude, longitude, notes: 'Mock check-in' });
      setIsGpsLoading(false);
      if (visit.gpsVerified) {
        toast.success('Mock check-in recorded! Proximity GPS Verified successfully.');
        setCheckinSuccess(true);
        fetchVisits();
      } else {
        toast.warning('Mock check-in recorded, but GPS verified as out-of-proximity!');
        setCheckinSuccess(true);
        fetchVisits();
      }
    } catch (err: any) {
      setIsGpsLoading(false);
      setCheckinError(err.response?.data?.error || 'Failed check-in');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(calculateTotal());
    if (total <= 0) return toast.error('Please select at least 1 product.');

    const items = Object.entries(orderQuantities).filter(([_, qty]) => qty > 0).map(([productId, qty]) => {
      const p = products.find((prod) => prod.id === productId);
      return { productId, quantity: qty, unitPrice: p ? parseFloat(p.price) : 0 };
    });

    try {
      await addOrder({ shopId: selectedShopId, items });
      setOrderPlacedSuccess(true);
      toast.success(`Soap order placed successfully!`);
      setOrderQuantities({});
      fetchOrders();
      setTimeout(() => setOrderPlacedSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to place order.');
    }
  };

  const onSubmitShop = async (data: any) => {
    try {
      await addShop({
        name: data.name.trim(), ownerName: data.ownerName?.trim() || undefined,
        phone: data.phone.trim(), address: data.address?.trim() || undefined,
        latitude: data.latitude, longitude: data.longitude,
      });
      setRegisterSuccess(true);
      toast.success(`Registered ${data.name}! Pending approval.`);
      reset(); fetchShops();
      setTimeout(() => { setRegisterSuccess(false); setSearchParams({ tab: 'shops' }); }, 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to register shop.');
    }
  };

  const openDrawer = (shopId: string, drawer: 'checkin' | 'order') => {
    setSelectedShopId(shopId);
    if (drawer === 'checkin') {
      setCheckinSuccess(false);
      setCheckinError(null);
      setIsCheckinDrawerOpen(true);
    } else {
      setOrderPlacedSuccess(false);
      setOrderQuantities({});
      setIsOrderDrawerOpen(true);
    }
  };

  // Calculate detailed timeline metrics for shop cards
  const shopStatsMap = useMemo(() => {
    const stats: Record<string, { ordersCount: number; visitsCount: number; lastVisitedText: string }> = {};

    shops.forEach(shop => {
      const shopOrders = orders.filter(o => o.shopId === shop.id);
      const shopVisits = visits.filter(v => v.shopId === shop.id);
      
      let lastVisitedText = 'Never';
      if (shopVisits.length > 0) {
        const sorted = [...shopVisits].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
        const lastVisitDate = new Date(sorted[0].visitedAt);
        const day = lastVisitDate.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[lastVisitDate.getMonth()];
        const year = lastVisitDate.getFullYear();
        lastVisitedText = `${day} ${month} ${year}`;
      }

      stats[shop.id] = {
        ordersCount: shopOrders.length,
        visitsCount: shopVisits.length,
        lastVisitedText
      };
    });

    return stats;
  }, [shops, visits, orders]);

  // Redesign Filtering & Sorting Computations
  const filteredShops = useMemo(() => {
    let result = [...shops];

    // 1. Exclude rejected shops
    result = result.filter(s => s.status !== 'rejected');

    // 2. Search query filter (matches shop name, address, owner name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(q))
      );
    }

    // 3. Category selector filter
    if (activeCategory === 'starred') {
      result = result.filter(s => starredIds.includes(s.id));
    } else if (activeCategory === 'near_me') {
      result = result.filter(s => getProximityMeters(s) <= 2000); // within 2km proximity boundary
    } else if (activeCategory === 'recent') {
      // visited in the last 7 days
      result = result.filter(s => {
        const shopVisits = visits.filter(v => v.shopId === s.id);
        return shopVisits.some(v => {
          const diffTime = Math.abs(new Date().getTime() - new Date(v.visitedAt).getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        });
      });
    } else if (activeCategory === 'pending') {
      result = result.filter(s => s.status === 'pending_approval');
    }

    // 4. Default Sort: Prioritize geographical Proximity (closer first)
    result.sort((a, b) => {
      const distA = getProximityMeters(a);
      const distB = getProximityMeters(b);
      return distA - distB;
    });

    return result;
  }, [shops, searchQuery, activeCategory, starredIds, currentCoords, visits]);

  // Computed order sorting/filtering for salesmen
  const ONGOING_STATUSES = ['pending_approval', 'confirmed', 'dispatched'];
  const DELIVERED_STATUSES = ['delivered'];

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by activeShop
    if (activeShop) {
      result = result.filter(o => o.shopId === activeShop.id);
    }

    // Filter by tab status
    if (orderTab === 'ongoing') {
      result = result.filter(o => ONGOING_STATUSES.includes(o.status));
    } else if (orderTab === 'delivered') {
      result = result.filter(o => DELIVERED_STATUSES.includes(o.status));
    }

    // Apply sorting
    result.sort((a, b) => {
      if (orderSort === 'date_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (orderSort === 'date_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (orderSort === 'shop_asc') {
        return (a.shopName || '').localeCompare(b.shopName || '');
      }
      if (orderSort === 'shop_desc') {
        return (b.shopName || '').localeCompare(a.shopName || '');
      }
      if (orderSort === 'value_asc') {
        return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
      }
      if (orderSort === 'value_desc') {
        return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
      }
      return 0;
    });

    return result;
  }, [orders, orderTab, orderSort, activeShop]);

  return (
    <SwipeableContainer
      key={mobileTab}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      contentClassName={swipeClass}
    >
      <div className="flex flex-col gap-4 pb-16 relative">
      {/* Online/Offline Status sync banner */}
      <div className="flex items-center justify-between bg-[#080d09] border border-[#142217] rounded-xl p-3 select-none">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-950">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span>Online Core Link Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-950">
              <div className="size-2 rounded-full bg-red-500" />
              <span>Offline Database Cache Active {queue.length > 0 && `(${queue.length})`}</span>
            </div>
          )}
        </div>
        
        {isOnline && queue.length > 0 && (
          <Button 
            onClick={handleManualSync} 
            disabled={isSyncing} 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs border-emerald-800 text-emerald-400 hover:bg-emerald-950/20"
          >
            <RefreshCw className={`size-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Queue ({queue.length})</span>
          </Button>
        )}
      </div>

      {mobileTab === 'shops' && (
        <div className="flex flex-col gap-4 select-none">
          {/* Top Brand Greeting Header (Airbnb visual style) */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[#e1fd52] font-extrabold uppercase tracking-widest">
                Made For You
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">
                Explore Outlets
              </h2>
            </div>
            
            {/* Quick GPS position fetcher */}
            <Button
              type="button"
              variant="outline"
              onClick={getDeviceCoords}
              className="size-9 rounded-full p-0 flex items-center justify-center border-[#1b2820] hover:border-emerald-800 text-slate-300 hover:text-emerald-400"
              title="Refresh GPS Coordinates"
            >
              <Navigation2 className="size-4 rotate-45" />
            </Button>
          </div>

          {/* Translucent Airbnb floating search bar */}
          <div className="flex items-center gap-2 bg-[#090d0a]/90 backdrop-blur-md border border-[#17221b] rounded-2xl px-3.5 py-1.5 shadow-lg relative z-20">
            <Search className="size-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search outlets, addresses, owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none h-8 w-full border-none focus:ring-0"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-300 px-1"
              >
                Clear
              </button>
            )}
            <div className="w-px h-5 bg-[#17221b]" />
            <button
              type="button"
              onClick={() => setActiveCategory(activeCategory === 'near_me' ? 'all' : 'near_me')}
              className={`p-1 rounded transition-colors ${activeCategory === 'near_me' ? 'text-[#e1fd52]' : 'text-slate-400 hover:text-slate-200'}`}
              title="Filter by Proximity"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>

          {/* Categories Horizontal Pills Scroll (Matching Airbnb filters exactly) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {/* Pill ALL */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wide uppercase shrink-0 rounded-full border transition-all ${
                activeCategory === 'all'
                  ? 'bg-[#e1fd52] text-[#090d0a] border-transparent font-extrabold shadow-md shadow-lime-500/10'
                  : 'bg-[#090d0a] border-[#17221b] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="size-3.5" />
              <span>All Outlets</span>
            </button>

            {/* Pill STARRED */}
            <button
              onClick={() => setActiveCategory('starred')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wide uppercase shrink-0 rounded-full border transition-all ${
                activeCategory === 'starred'
                  ? 'bg-[#e1fd52] text-[#090d0a] border-transparent font-extrabold shadow-md shadow-lime-500/10'
                  : 'bg-[#090d0a] border-[#17221b] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className={`size-3.5 ${activeCategory === 'starred' ? 'fill-black' : ''}`} />
              <span>Starred ({starredIds.length})</span>
            </button>

            {/* Pill NEAR ME */}
            <button
              onClick={() => setActiveCategory('near_me')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wide uppercase shrink-0 rounded-full border transition-all ${
                activeCategory === 'near_me'
                  ? 'bg-[#e1fd52] text-[#090d0a] border-transparent font-extrabold shadow-md shadow-lime-500/10'
                  : 'bg-[#090d0a] border-[#17221b] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Navigation2 className="size-3.5 rotate-45" />
              <span>Near Me (&lt;2km)</span>
            </button>

            {/* Pill RECENTLY VISITED */}
            <button
              onClick={() => setActiveCategory('recent')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wide uppercase shrink-0 rounded-full border transition-all ${
                activeCategory === 'recent'
                  ? 'bg-[#e1fd52] text-[#090d0a] border-transparent font-extrabold shadow-md shadow-lime-500/10'
                  : 'bg-[#090d0a] border-[#17221b] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="size-3.5" />
              <span>Visited Recently</span>
            </button>

            {/* Pill PENDING REVIEW */}
            <button
              onClick={() => setActiveCategory('pending')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wide uppercase shrink-0 rounded-full border transition-all ${
                activeCategory === 'pending'
                  ? 'bg-[#e1fd52] text-[#090d0a] border-transparent font-extrabold shadow-md shadow-lime-500/10'
                  : 'bg-[#090d0a] border-[#17221b] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="size-3.5" />
              <span>Pending Review</span>
            </button>
          </div>

          {/* VIEW SWITCHER LOGIC */}
          {!showMap ? (
            /* ────────────────────────────────────────────────────────── */
            /*                        1. LIST VIEW                        */
            /* ────────────────────────────────────────────────────────── */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 px-1">
                <span>Showing {filteredShops.length} outlets</span>
                <span>Sorted by Distance</span>
              </div>

              {filteredShops.length === 0 ? (
                <Card className="bg-[#0b0f0c] border-[#17221b] py-8 text-center">
                  <CardContent className="flex flex-col items-center gap-3">
                    <span className="text-4xl text-slate-600">🔎</span>
                    <h3 className="font-bold text-slate-300">No matching outlets found</h3>
                    <p className="text-xs text-slate-500 max-w-[250px]">
                      Try clearing search parameters, changing filter category, or registering a new shop in the next tab.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredShops.map((shop) => {
                    const stats = shopStatsMap[shop.id] || { ordersCount: 0, visitsCount: 0, lastVisitedText: 'Never Visited' };
                    return (
                      <ShopTile
                        key={shop.id}
                        shop={shop}
                        distance={getDistanceString(shop)}
                        isFavorited={starredIds.includes(shop.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onCheckIn={(id) => openDrawer(id, 'checkin')}
                        onOrder={(id) => openDrawer(id, 'order')}
                        ordersCount={stats.ordersCount}
                        visitsCount={stats.visitsCount}
                        lastVisitedText={stats.lastVisitedText}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────── */
            /*                        2. MAP VIEW                         */
            /* ────────────────────────────────────────────────────────── */
            <div className="relative w-full h-[calc(100dvh-13rem)] min-h-[400px] md:h-[600px] overflow-hidden flex flex-col">
              <div className="flex-1 w-full h-full relative">
                <ShopMap
                  shops={filteredShops}
                  userCoords={currentCoords}
                  selectedShopId={selectedShopId || null}
                  onSelectShop={(id) => {
                    setSelectedShopId(id);
                    setMapSheetState('expanded'); // Auto expand info panel
                  }}
                />
              </div>

              {/* Swipeable Floating Bottom Sheet Card list (matching screenshot 2 layout) */}
              <div 
                className={`absolute bottom-3 inset-x-3 z-30 transition-all duration-300 flex flex-col bg-[#080d09]/95 backdrop-blur-md border border-emerald-950/80 rounded-2xl overflow-hidden shadow-2xl ${
                  mapSheetState === 'collapsed' 
                    ? 'h-10' 
                    : mapSheetState === 'peek' && selectedShopId 
                      ? 'h-[250px]'
                      : mapSheetState === 'peek' 
                        ? 'h-36' 
                        : 'h-[360px]'
                }`}
              >
                {/* Drag Handle Bar */}
                <div 
                  onClick={() => setMapSheetState(mapSheetState === 'expanded' ? 'peek' : 'expanded')}
                  className="w-full h-7 flex items-center justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-1.25 bg-[#17221b] rounded-full" />
                </div>

                <div className="p-3 pt-0 flex-1 overflow-y-auto">
                  {selectedShopId ? (
                    // Highlight selected shop in active Map Card popup
                    (() => {
                      const shop = shops.find(s => s.id === selectedShopId);
                      if (!shop) return null;
                      const stats = shopStatsMap[shop.id] || { ordersCount: 0, visitsCount: 0, lastVisitedText: 'Never Visited' };
                      return (
                        <div className="flex flex-col h-full gap-2">
                          <div className="flex items-center justify-between border-b border-[#17221b] pb-2 mb-1.5">
                            <span className="text-[10px] font-extrabold text-[#e1fd52] uppercase tracking-widest">Active Marker Details</span>
                            <button onClick={() => setSelectedShopId('')} className="text-[9px] uppercase font-bold text-slate-500 hover:text-slate-300">Close</button>
                          </div>
                          <div className="flex-1 overflow-y-auto">
                            <ShopTile
                              shop={shop}
                              distance={getDistanceString(shop)}
                              isFavorited={starredIds.includes(shop.id)}
                              onToggleFavorite={handleToggleFavorite}
                              onCheckIn={(id) => openDrawer(id, 'checkin')}
                              onOrder={(id) => openDrawer(id, 'order')}
                              ordersCount={stats.ordersCount}
                              visitsCount={stats.visitsCount}
                              lastVisitedText={stats.lastVisitedText}
                            />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Swipe recommended properties view list
                    <div className="flex flex-col h-full gap-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-extrabold uppercase tracking-wide border-b border-[#17221b] pb-2">
                        <span>Recommend for You</span>
                        <span>{filteredShops.length} outlets</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto py-2 scrollbar-none flex-1 items-start">
                        {filteredShops.slice(0, 8).map((shop) => {
                          const stats = shopStatsMap[shop.id] || { ordersCount: 0, visitsCount: 0, lastVisitedText: 'Never Visited' };
                          return (
                            <div key={shop.id} className="w-[280px] shrink-0">
                              <ShopTile
                                shop={shop}
                                distance={getDistanceString(shop)}
                                isFavorited={starredIds.includes(shop.id)}
                                onToggleFavorite={handleToggleFavorite}
                                onCheckIn={(id) => openDrawer(id, 'checkin')}
                                onOrder={(id) => openDrawer(id, 'order')}
                                ordersCount={stats.ordersCount}
                                visitsCount={stats.visitsCount}
                                lastVisitedText={stats.lastVisitedText}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FLOATING MAP/LIST TOGGLE BUTTON (Airbnb style absolute bottom action bar) */}
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 select-none">
            <button
              onClick={() => {
                setShowMap(!showMap);
                setSelectedShopId(''); // clear selection
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#090d0a] hover:bg-[#111813] border border-[#1e3025] hover:border-emerald-800 text-slate-50 hover:text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-2xl active:scale-95 transition-all"
            >
              {!showMap ? (
                <>
                  <MapIcon className="size-3.5 text-[#e1fd52]" />
                  <span>Show Map</span>
                </>
              ) : (
                <>
                  <ListIcon className="size-3.5 text-[#e1fd52]" />
                  <span>Show List</span>
                </>
              )}
            </button>
          </div>

          {/* Floating plus button FAB to register shop */}
          <button
            onClick={() => setSearchParams({ tab: 'register' })}
            className="hidden md:flex fixed bottom-24 right-6 z-40 items-center justify-center size-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-2xl hover:scale-105 active:scale-95 transition-all"
            title="Register New Shop"
          >
            <Plus className="size-6 text-slate-950 font-extrabold" />
          </button>
        </div>
      )}

      {mobileTab === 'register' && (
        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
          {/* Back Header for mobile registration view */}
          <div className="flex items-center gap-3 select-none">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchParams({ tab: 'shops' })}
              className="size-9 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#e1fd52] font-extrabold uppercase tracking-widest">Back to Outlets</span>
              <h2 className="text-xl font-extrabold text-slate-100">Register Outlet</h2>
            </div>
          </div>

          <Card className="bg-[#0b0f0c] border-[#17221b] w-full select-none shadow-xl mt-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-slate-100">Register New Shop</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Capture accurate GPS coordinates and submit coordinates for Admin review.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {registerSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  ✅ Outlet registered successfully! Awaiting Admin verification.
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmitShop)} className="flex flex-col gap-4">
                <FieldGroup className="gap-3">
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="name" className="text-xs font-bold text-slate-300">Shop Name *</FieldLabel>
                    <Input id="name" {...register('name')} aria-invalid={!!errors.name} className="bg-[#090d0a] border-[#17221b] focus:border-emerald-800 h-9.5 text-sm rounded-xl" />
                    <FieldError className="text-[10px] text-red-400">{errors.name?.message}</FieldError>
                  </Field>
                  <Field data-invalid={!!errors.phone}>
                    <FieldLabel htmlFor="phone" className="text-xs font-bold text-slate-300">Phone Number *</FieldLabel>
                    <Input id="phone" type="tel" {...register('phone')} aria-invalid={!!errors.phone} className="bg-[#090d0a] border-[#17221b] focus:border-emerald-800 h-9.5 text-sm rounded-xl" />
                    <FieldError className="text-[10px] text-red-400">{errors.phone?.message}</FieldError>
                  </Field>
                  <Field data-invalid={!!errors.ownerName}>
                    <FieldLabel htmlFor="ownerName" className="text-xs font-bold text-slate-300">Owner Name</FieldLabel>
                    <Input id="ownerName" {...register('ownerName')} aria-invalid={!!errors.ownerName} className="bg-[#090d0a] border-[#17221b] focus:border-emerald-800 h-9.5 text-sm rounded-xl" />
                    <FieldError className="text-[10px] text-red-400">{errors.ownerName?.message}</FieldError>
                  </Field>
                  <Field data-invalid={!!errors.address}>
                    <FieldLabel htmlFor="address" className="text-xs font-bold text-slate-300">Detailed Address</FieldLabel>
                    <Input id="address" {...register('address')} aria-invalid={!!errors.address} className="bg-[#090d0a] border-[#17221b] focus:border-emerald-800 h-9.5 text-sm rounded-xl" />
                    <FieldError className="text-[10px] text-red-400">{errors.address?.message}</FieldError>
                  </Field>
                  
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-300">GPS Proximity Coordinates Capture</span>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCaptureGps} 
                        disabled={isCapturingGps} 
                        className="flex-1 bg-[#090d0a] border-[#17221b] hover:border-emerald-800 h-9.5 rounded-xl font-bold text-xs"
                      >
                        {isCapturingGps ? 'Querying...' : 'Fetch Live GPS'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleUseMockGps} 
                        className="flex-1 border-[#1e3025] hover:border-emerald-800 text-[#e1fd52] hover:bg-emerald-950/20 h-9.5 rounded-xl font-bold text-xs"
                      >
                        Mock GPS
                      </Button>
                    </div>
                    {watch('latitude') !== 0 && (
                      <div className="text-[10px] font-mono text-slate-500 mt-1 px-1">
                        Lat: {watch('latitude')} · Lng: {watch('longitude')}
                      </div>
                    )}
                  </div>
                </FieldGroup>
                <Button type="submit" disabled={isSubmitting} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-bold text-sm">
                  {isSubmitting ? 'Registering...' : 'Submit For Approval'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {mobileTab === 'orders' && (
        <div className="flex flex-col gap-4 select-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[#e1fd52] font-extrabold uppercase tracking-widest">
                Ledger Logs
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">
                Recent Orders
              </h2>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Shop selector filter */}
              <div className="flex items-center gap-1.5 bg-[#090d0a]/90 border border-[#17221b] rounded-xl px-2.5 py-1.5 shadow-lg shrink-0">
                <Store className="size-4 text-emerald-400 shrink-0" />
                <select
                  value={activeShop ? activeShop.id : 'all'}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (e.target.value === 'all') {
                      newParams.delete('shopId');
                      newParams.delete('filter_shop');
                    } else {
                      const selected = shops.find(s => s.id === e.target.value);
                      if (selected) {
                        newParams.set('filter_shop', selected.name);
                        newParams.set('shopId', selected.id);
                      }
                    }
                    setSearchParams(newParams);
                  }}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer border-none font-bold uppercase tracking-wider pr-2 text-sm"
                >
                  <option value="all">All Shops</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Sorting controls */}
              <div className="flex items-center gap-1.5 bg-[#090d0a]/90 border border-[#17221b] rounded-xl px-2.5 py-1.5 shadow-lg shrink-0">
                <ArrowUpDown className="size-4 text-emerald-400 shrink-0" />
                <select
                  value={orderSort}
                  onChange={(e) => setOrderSort(e.target.value as any)}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer border-none font-bold uppercase tracking-wider pr-2"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="shop_asc">Shop A-Z</option>
                  <option value="shop_desc">Shop Z-A</option>
                  <option value="value_asc">Value low-high</option>
                  <option value="value_desc">Value high-low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Swipeable Tabs */}
          <SwipeableTabs
            tabs={[
              { value: 'all', label: 'All', count: orders.length },
              { value: 'ongoing', label: 'Ongoing', count: orders.filter(o => ONGOING_STATUSES.includes(o.status)).length },
              { value: 'delivered', label: 'Fulfilled', count: orders.filter(o => DELIVERED_STATUSES.includes(o.status)).length },
            ]}
            activeTab={orderTab}
            onChange={(value) => setOrderTab(value as any)}
          >
            <PaginatedList<Order>
              queryKeyPrefix="salesman-orders"
              endpoint="/orders"
              perPage={10}
              searchParamsFilter={ordersFilters}
              dataKey="orders"
              itemKeyExtractor={(o) => o.id}
              emptyState={
                <Card className="bg-[#0b0f0c] border-[#17221b] py-12 text-center rounded-2xl w-full">
                  <CardContent className="flex flex-col items-center gap-3">
                    <span className="text-4xl text-slate-600">🧾</span>
                    <h3 className="font-bold text-slate-300">No orders found</h3>
                    <p className="text-xs text-slate-500 max-w-[250px]">
                      No B2B orders match this category. Tap target outlets to place a new order!
                    </p>
                  </CardContent>
                </Card>
              }
              renderItem={(order) => {
                const statusColors = {
                  pending_approval: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  dispatched: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
                };
                return (
                  <div
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="flex gap-4 p-4 bg-[#0b0f0c] border border-[#17221b] rounded-2xl hover:border-emerald-800/40 hover:bg-[#0c120e] transition-all cursor-pointer group"
                  >
                    {/* Package graphic */}
                    <div className="size-14 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Package className="size-7 text-emerald-400" />
                    </div>

                    {/* Content details */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 truncate uppercase">
                          #{order.id.substring(0, 8)}
                        </span>
                        <span className={cn(
                          "inline-flex items-center text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                          statusColors[order.status as keyof typeof statusColors] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        )}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      <span className="font-extrabold text-sm text-slate-100 truncate">
                        {order.shopName || 'Outlet Orders'}
                      </span>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                        <span className="font-bold">
                          {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#e1fd52] font-extrabold flex items-center">
                            <IndianRupee className="size-3.5 mr-0.5" />
                            {parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Actions tracking bar */}
                      <div className="flex items-center justify-between border-t border-[#17221b]/60 pt-2 mt-2">
                        <span className="text-[10px] text-slate-400 font-bold group-hover:text-emerald-400 transition-colors">
                          View details
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/order/${order.id}`);
                          }}
                          className="flex items-center gap-1 text-[10px] text-[#e1fd52] font-extrabold uppercase tracking-widest hover:text-emerald-400 transition-colors"
                        >
                          <span>Track Order</span>
                          <ChevronRight className="size-3 text-[#e1fd52] group-hover:text-emerald-400 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </SwipeableTabs>
        </div>
      )}

      {mobileTab === 'visits' && (
        <div className="flex flex-col gap-4 select-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[#e1fd52] font-extrabold uppercase tracking-widest">
                Check-In Ledger
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">
                My Visits
              </h2>
            </div>
            
            {/* Shop selector filter */}
            <div className="flex items-center gap-1.5 bg-[#090d0a]/90 border border-[#17221b] rounded-xl px-2.5 py-1.5 shadow-lg shrink-0">
              <Store className="size-4 text-emerald-400 shrink-0" />
              <select
                value={activeShop ? activeShop.id : 'all'}
                onChange={(e) => {
                  const newParams = new URLSearchParams(searchParams);
                  if (e.target.value === 'all') {
                    newParams.delete('shopId');
                    newParams.delete('filter_shop');
                  } else {
                    const selected = shops.find(s => s.id === e.target.value);
                    if (selected) {
                      newParams.set('filter_shop', selected.name);
                      newParams.set('shopId', selected.id);
                    }
                  }
                  setSearchParams(newParams);
                }}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer border-none font-bold uppercase tracking-wider pr-2 text-sm"
              >
                <option value="all">All Shops</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <PaginatedList<Visit>
            queryKeyPrefix="salesman-visits"
            endpoint="/visits"
            perPage={10}
            searchParamsFilter={visitsFilters}
            dataKey="visits"
            itemKeyExtractor={(v) => v.id}
            listClassName="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-[1.5px] before:bg-emerald-950/40"
            emptyState={
              <Card className="bg-[#0b0f0c] border-[#17221b] py-12 text-center rounded-2xl w-full">
                <CardContent className="flex flex-col items-center gap-3">
                  <span className="text-4xl text-slate-600">📍</span>
                  <h3 className="font-bold text-slate-300">No visits logged</h3>
                  <p className="text-xs text-slate-500 max-w-[250px]">
                    No check-ins match this filter. Visit an outlet and click Check In to log real-time GPS check-ins!
                  </p>
                </CardContent>
              </Card>
            }
            renderItem={(visit) => (
              <div className="flex gap-4 items-start pl-1 relative z-10">
                {/* Timeline node */}
                <div className="size-8 rounded-full bg-[#0b0f0c] border border-[#17221b] flex items-center justify-center text-emerald-400 shrink-0 shadow-sm mt-0.5">
                  <MapPin className="size-3.5" />
                </div>
                
                {/* Content card */}
                <div className="flex-1 p-4 bg-[#0b0f0c] border-[#17221b] rounded-2xl flex flex-col gap-1.5 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider block">
                        {new Date(visit.visitedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                        {new Date(visit.visitedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs font-bold text-slate-200 block truncate mt-0.5">
                        {visit.shopName}
                      </span>
                    </div>
                    
                    {/* GPS status badge */}
                    <span className={`inline-flex items-center text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${
                      visit.gpsVerified 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {visit.gpsVerified ? 'GPS Verified' : 'GPS Mismatch'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-medium italic mt-1 break-words">
                    "{visit.notes || 'Routine field inspection check-in.'}"
                  </p>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Drawers */}
      <Drawer open={isCheckinDrawerOpen} onOpenChange={setIsCheckinDrawerOpen}>
        <DrawerContent className="bg-[#080d09] border-[#17221b] text-slate-100 select-none pb-4">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base font-extrabold text-slate-100">GPS Proximity Check-in</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 pb-0 flex flex-col gap-4">
              <div className="flex flex-col gap-1 bg-[#0c1310] border border-[#17221b] rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Outlet</span>
                <span className="font-extrabold text-sm text-emerald-400">{shops.find(s => s.id === selectedShopId)?.name}</span>
                <span className="text-[10px] text-slate-400 mt-1">{shops.find(s => s.id === selectedShopId)?.address}</span>
              </div>

              {checkinSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  ✅ Check-in recorded successfully! Visit locked.
                </div>
              )}
              {checkinError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold whitespace-pre-wrap">
                  <div className="font-bold mb-1">Check-in Validation Failed</div>
                  ❌ {checkinError}
                </div>
              )}

              {coordsMock && (
                <div className="text-[10px] font-mono text-slate-500 text-center">
                  Lock: {coordsMock}
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <Button onClick={handleGpsCheckin} disabled={isGpsLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-bold text-xs shadow-md">
                  {isGpsLoading ? 'Querying GPS...' : 'Check In (Real GPS)'}
                </Button>
                <Button onClick={handleMockCheckin} disabled={isGpsLoading} variant="outline" className="w-full border-emerald-800 text-emerald-400 hover:bg-emerald-950/20 rounded-xl h-10 font-bold text-xs">
                  Mock Check In (Force Proximity)
                </Button>
              </div>
            </div>
            <DrawerFooter className="pt-4">
              <DrawerClose asChild>
                <Button variant="ghost" className="w-full text-xs font-bold text-slate-500 hover:text-slate-300 rounded-xl">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={isOrderDrawerOpen} onOpenChange={setIsOrderDrawerOpen}>
        <DrawerContent className="bg-[#080d09] border-[#17221b] text-slate-100 max-h-[85vh] select-none pb-4">
          <div className="mx-auto w-full max-w-md h-full flex flex-col">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base font-extrabold text-slate-100">Place Soap Order</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 pb-0 overflow-y-auto flex-1">
              <div className="flex flex-col gap-1 bg-[#0c1310] border border-[#17221b] rounded-xl p-3 mb-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Outlet Target</span>
                <span className="font-extrabold text-sm text-emerald-400">{shops.find(s => s.id === selectedShopId)?.name}</span>
              </div>

              {orderPlacedSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  🎉 Order placed successfully! It will dispatch shortly.
                </div>
              )}

              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Detergent Catalog</span>
                {products.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between bg-[#0b0f0c] p-3.5 rounded-xl border border-[#17221b]">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-200">{prod.name}</span>
                      <span className="text-[11px] text-[#e1fd52] font-semibold mt-0.5">${parseFloat(prod.price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#080d09] border border-[#17221b] rounded-xl p-1 shrink-0">
                      <button 
                        type="button" 
                        onClick={() => decrementQty(prod.id)} 
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#142217] active:bg-[#1b2f20] text-emerald-400 font-extrabold text-sm select-none"
                      >
                        -
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-slate-300">{orderQuantities[prod.id] || 0}</span>
                      <button 
                        type="button" 
                        onClick={() => incrementQty(prod.id)} 
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#142217] active:bg-[#1b2f20] text-emerald-400 font-extrabold text-sm select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-[#080d09] border-t border-[#17221b] mt-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Order Amount</span>
                <span className="text-lg font-extrabold text-[#e1fd52]">${calculateTotal()}</span>
              </div>
              <DrawerFooter className="p-0">
                <Button 
                  onClick={handlePlaceOrder} 
                  disabled={calculateTotal() === '0.00'} 
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-xl h-10 font-bold text-xs shadow-md"
                >
                  Submit Order
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" className="w-full mt-2 text-xs font-bold text-slate-500 hover:text-slate-300 rounded-xl h-9">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      </div>
    </SwipeableContainer>
  );
};
