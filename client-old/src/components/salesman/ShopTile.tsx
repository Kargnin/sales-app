import React from 'react';
import { MapPin, ShoppingBag, Calendar, Heart } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.js';
import { Shop } from '../../stores/appStore.js';
import { ItemTileLayout } from '../ui/ItemTileLayout.js';

// Procedural storefront SVG builder to make each outlet card visually outstanding
const StorefrontIllustration: React.FC<{ shopId: string; shopName: string }> = ({ shopId, shopName }) => {
  // Generate stable visual values from hashing the shopId
  const getHash = (str: string, seed = 0) => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hashVal = getHash(shopId || 'default');
  
  // Curated premium color schemes fitting our slate/forest green theme
  const wallColors = [
    '#1c2520', // Forest Charcoal
    '#1e293b', // Slate Blue
    '#27272a', // Zinc Dark
    '#1f2e26', // Sage Dark
    '#2b2d42', // Deep Navy
    '#343a40', // Charcoal Gray
  ];
  
  const awningColors = [
    '#10b981', // Emerald
    '#059669', // Dark Emerald
    '#0d9488', // Teal
    '#eab308', // Amber Accent
    '#06b6d4', // Cyan
    '#3b82f6', // Bright Blue
  ];

  const doorStyles = [
    'wood', 
    'glass', 
    'sliding'
  ];

  const wallColor = wallColors[hashVal % wallColors.length];
  const awningColor = awningColors[(hashVal >> 1) % awningColors.length];
  const doorStyle = doorStyles[(hashVal >> 2) % doorStyles.length];
  
  // Decide extra decorative details
  const hasScooter = (hashVal % 3) === 0;
  const hasPlant = (hashVal % 2) === 0;
  const hasLamp = (hashVal % 4) === 0;
  
  // Truncate name for storefront sign
  const displaySignName = shopName.substring(0, 15).toUpperCase();

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center animate-fade-in">
      {/* Background soft ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-950/90 to-slate-950" />
      
      <svg className="w-full h-full select-none" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sky / Horizon */}
        <line x1="0" y1="140" x2="320" y2="140" stroke="#1f2937" strokeWidth="1" />
        
        {/* Building Back Wall */}
        <rect x="50" y="30" width="220" height="110" rx="3" fill={wallColor} stroke="#2e3e35" strokeWidth="1" />
        <rect x="55" y="35" width="210" height="105" rx="2" fill="url(#wallPattern)" opacity="0.05" />

        {/* Windows */}
        <rect x="70" y="60" width="40" height="40" rx="2" fill="#090d0a" stroke="#2e3e35" strokeWidth="1.5" />
        <line x1="90" y1="60" x2="90" y2="100" stroke="#2e3e35" strokeWidth="1" />
        <line x1="70" y1="80" x2="110" y2="80" stroke="#2e3e35" strokeWidth="1" />
        <rect x="73" y="63" width="15" height="15" fill="#fef08a" opacity="0.15" /> {/* Light glow */}
        
        <rect x="210" y="60" width="40" height="40" rx="2" fill="#090d0a" stroke="#2e3e35" strokeWidth="1.5" />
        <line x1="230" y1="60" x2="230" y2="100" stroke="#2e3e35" strokeWidth="1" />
        <line x1="210" y1="80" x2="250" y2="80" stroke="#2e3e35" strokeWidth="1" />
        <rect x="232" y="63" width="15" height="15" fill="#fef08a" opacity="0.15" /> {/* Light glow */}

        {/* Main Door */}
        {doorStyle === 'wood' && (
          <>
            <rect x="135" y="65" width="50" height="75" rx="1" fill="#451a03" stroke="#2e3e35" strokeWidth="1.5" />
            <rect x="140" y="70" width="18" height="30" fill="#3b0764" opacity="0.2" />
            <rect x="162" y="70" width="18" height="30" fill="#3b0764" opacity="0.2" />
            <circle cx="142" cy="102" r="2" fill="#fbbf24" />
          </>
        )}
        {doorStyle === 'glass' && (
          <>
            <rect x="135" y="65" width="50" height="75" rx="1" fill="#0c1310" stroke="#10b981" strokeWidth="1.5" />
            <rect x="140" y="70" width="18" height="65" fill="#e2fcf4" opacity="0.08" />
            <rect x="162" y="70" width="18" height="65" fill="#e2fcf4" opacity="0.08" />
            <line x1="160" y1="75" x2="160" y2="125" stroke="#10b981" strokeWidth="1" />
          </>
        )}
        {doorStyle === 'sliding' && (
          <>
            <rect x="135" y="65" width="50" height="75" rx="1" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
            <line x1="135" y1="75" x2="185" y2="75" stroke="#3f3f46" strokeWidth="1" />
            <line x1="135" y1="85" x2="185" y2="85" stroke="#3f3f46" strokeWidth="1" />
            <line x1="135" y1="95" x2="185" y2="95" stroke="#3f3f46" strokeWidth="1" />
            <line x1="135" y1="105" x2="185" y2="105" stroke="#3f3f46" strokeWidth="1" />
            <line x1="135" y1="115" x2="185" y2="115" stroke="#3f3f46" strokeWidth="1" />
            <line x1="135" y1="125" x2="185" y2="125" stroke="#3f3f46" strokeWidth="1" />
          </>
        )}

        {/* Shop Awning (Striped/Solid) */}
        <polygon points="40,25 280,25 270,55 50,55" fill={awningColor} stroke="#1b2821" strokeWidth="1" />
        {/* Striped details */}
        <polygon points="65,25 90,25 80,55 55,55" fill="#18181b" opacity="0.2" />
        <polygon points="115,25 140,25 130,55 105,55" fill="#18181b" opacity="0.2" />
        <polygon points="165,25 190,25 180,55 155,55" fill="#18181b" opacity="0.2" />
        <polygon points="215,25 240,25 230,55 205,55" fill="#18181b" opacity="0.2" />
        <polygon points="255,25 275,25 265,55 245,55" fill="#18181b" opacity="0.2" />
        
        {/* Awning Valance fringes */}
        <path d="M50,55 Q55,60 60,55 Q65,60 70,55 Q75,60 80,55 Q85,60 90,55 Q95,60 100,55 Q105,60 110,55 Q115,60 120,55 Q125,60 130,55 Q135,60 140,55 Q145,60 150,55 Q155,60 160,55 Q165,60 170,55 Q175,60 180,55 Q185,60 190,55 Q195,60 200,55 Q205,60 210,55 Q215,60 220,55 Q225,60 230,55 Q235,60 240,55 Q245,60 250,55 Q255,60 260,55 Q265,60 270,55" fill={awningColor} stroke="#1b2821" strokeWidth="0.5" />

        {/* Main Banner / Shop Signboard */}
        <rect x="80" y="8" width="160" height="15" rx="1.5" fill="#080d0a" stroke="#2e3e35" strokeWidth="1" />
        <text x="160" y="19" fill="#e2fcf4" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="0.5">{displaySignName}</text>

        {/* Decorative Light Lamp */}
        {hasLamp && (
          <>
            <path d="M160,23 L160,33" stroke="#9ca3af" strokeWidth="1.5" />
            <circle cx="160" cy="33" r="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" className="animate-pulse" />
          </>
        )}

        {/* Dynamic Extra Detail 1: Potted Plant */}
        {hasPlant && (
          <g transform="translate(280, 110)">
            <rect x="0" y="20" width="12" height="10" rx="1" fill="#78350f" />
            <ellipse cx="6" cy="15" rx="8" ry="7" fill="#047857" />
            <ellipse cx="6" cy="9" rx="5" ry="5" fill="#059669" />
          </g>
        )}

        {/* Dynamic Extra Detail 2: Delivery/Scooter Box */}
        {hasScooter && (
          <g transform="translate(15, 115)">
            <circle cx="12" cy="20" r="5" fill="#3f3f46" />
            <rect x="6" y="8" width="12" height="9" fill="#dc2626" rx="1" />
            <rect x="9" y="10" width="6" height="5" fill="#f87171" opacity="0.3" />
            <line x1="12" y1="17" x2="12" y2="20" stroke="#71717a" strokeWidth="1" />
          </g>
        )}

        {/* Bottom Dirt/Road overlay */}
        <rect x="0" y="140" width="320" height="20" fill="#090d0b" />
        <line x1="0" y1="140" x2="320" y2="140" stroke="#1f2c25" strokeWidth="1.5" />
        
        {/* Patterns */}
        <defs>
          <pattern id="wallPattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="3" x2="6" y2="3" stroke="#ffffff" strokeWidth="0.5" />
            <line x1="3" y1="0" x2="3" y2="6" stroke="#ffffff" strokeWidth="0.5" />
          </pattern>
        </defs>
      </svg>
    </div>
  );
};

interface ShopTileProps {
  shop: Shop;
  distance?: string;
  isFavorited?: boolean;
  onToggleFavorite?: (shopId: string) => void;
  onCheckIn?: (shopId: string) => void;
  onOrder?: (shopId: string) => void;
  ordersCount: number;
  visitsCount: number;
  lastVisitedText: string;
}

export const ShopTile: React.FC<ShopTileProps> = ({
  shop,
  distance,
  isFavorited,
  onToggleFavorite,
  onCheckIn,
  onOrder,
  ordersCount,
  visitsCount,
  lastVisitedText,
}) => {
  const navigate = useNavigate();
  
  // Calculate outstanding sales metric
  const mockOutstandingAmount = ordersCount > 0 
    ? (ordersCount * 125.5).toFixed(0) 
    : (45 + (shop.name.length * 15)).toFixed(0);

  return (
    <ItemTileLayout
      onClick={() => navigate(`/shop/${shop.id}`)}
      illustration={<StorefrontIllustration shopId={shop.id} shopName={shop.name} />}
      floatingBadges={
        shop.status === 'approved' ? (
          <span className="flex items-center gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-[#101512]/80 backdrop-blur-md border border-emerald-900/50 text-[#c2fce7] text-[8px] md:text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md">
            <span className="relative flex size-1 md:size-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-1 md:size-1.5 bg-emerald-400"></span>
            </span>
            {distance && distance !== 'Unknown' ? `${distance}` : 'Active'}
          </span>
        ) : shop.status === 'pending_approval' ? (
          <span className="flex items-center gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-amber-950/80 backdrop-blur-md border border-amber-900/60 text-amber-400 text-[8px] md:text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md">
            Pending
          </span>
        ) : (
          <span className="flex items-center gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-red-950/80 backdrop-blur-md border border-red-900/60 text-red-400 text-[8px] md:text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-md">
            Rejected
          </span>
        )
      }
      floatingAction={
        onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(shop.id);
            }}
            className="p-1.5 md:p-2 rounded-full bg-[#101512]/70 backdrop-blur-md border border-white/5 hover:border-white/10 hover:bg-[#101512]/90 active:scale-90 transition-all shadow-md"
            aria-label="Star Outlet"
          >
            <Heart 
              className={`size-3.5 md:size-4.5 transition-colors ${
                isFavorited 
                  ? 'fill-red-500 text-red-500 scale-110' 
                  : 'text-slate-400 hover:text-slate-200'
              }`} 
            />
          </button>
        )
      }
      title={shop.name}
      highlightText={`₹${parseFloat(mockOutstandingAmount).toLocaleString('en-IN')}`}
      subtitle={
        <>
          <MapPin className="size-3 text-slate-500 shrink-0" />
          <span className="truncate">{shop.address || 'No address registered'}</span>
        </>
      }
      tags={
        <>
          {/* Orders Counter Tag */}
          <div className="flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300">
            <ShoppingBag className="size-2.5 md:size-3 text-emerald-400" />
            <span>{ordersCount} Ord</span>
          </div>

          {/* Visits Timeline Tag */}
          <div className="flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300">
            <Calendar className="size-2.5 md:size-3 text-teal-400 font-medium" />
            <span className="truncate max-w-[120px] sm:max-w-none">LV: {lastVisitedText}</span>
          </div>
        </>
      }
      bottomActions={
        onCheckIn && onOrder && (
          <div className="grid grid-cols-2 gap-1.5 md:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={shop.status === 'pending_approval' && !(shop as any).offline}
              onClick={(e) => {
                e.stopPropagation();
                onCheckIn(shop.id);
              }}
              className="flex items-center justify-center gap-1 h-7.5 md:h-8.5 rounded-xl border-[#1c2e21] hover:border-emerald-800 hover:bg-emerald-950/20 text-slate-300 hover:text-emerald-400 font-bold text-[10px] sm:text-[11px] md:text-xs"
            >
              <MapPin className="size-3 shrink-0" />
              <span>Check-in</span>
            </Button>

            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOrder(shop.id);
              }}
              className="flex items-center justify-center gap-1 h-7.5 md:h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-[11px] md:text-xs"
            >
              <ShoppingBag className="size-3 shrink-0" />
              <span>Order</span>
            </Button>
          </div>
        )
      }
    />
  );
};
