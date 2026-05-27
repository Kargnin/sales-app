import React from 'react';
import { Package, Calendar, Info } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Product } from '../../stores/appStore.js';
import { ItemTileLayout } from '../ui/ItemTileLayout.js';

// Procedural SVG detergent illustration builder to make each product tile distinct and extremely premium
const DetergentIllustration: React.FC<{ productId: string; productName: string }> = ({ productId, productName }) => {
  const getHash = (str: string, seed = 0) => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hashVal = getHash(productId || 'default');
  const nameLower = productName.toLowerCase();

  // Curated premium detergent liquid color schemes
  const lavenderColors = { liquid: '#a855f7', bottle: '#3b0764', label: '#e9d5ff', cap: '#d8b4fe' }; // Purple Lavender
  const freshColors = { liquid: '#06b6d4', bottle: '#083344', label: '#cffafe', cap: '#67e8f9' };    // Ocean Blue
  const limeColors = { liquid: '#10b981', bottle: '#022c22', label: '#d1fae5', cap: '#6ee7b7' };     // Mint Green
  const amberColors = { liquid: '#f59e0b', bottle: '#451a03', label: '#fef3c7', cap: '#fcd34d' };    // Citrus Gold

  let scheme = freshColors;
  if (nameLower.includes('lavender') || nameLower.includes('rose') || (hashVal % 4 === 0)) {
    scheme = lavenderColors;
  } else if (nameLower.includes('mint') || nameLower.includes('lime') || nameLower.includes('green') || (hashVal % 4 === 1)) {
    scheme = limeColors;
  } else if (nameLower.includes('gold') || nameLower.includes('citrus') || nameLower.includes('bar') || (hashVal % 4 === 2)) {
    scheme = amberColors;
  }

  // Detect type: liquid bottle vs bar soap
  const isLiquid = nameLower.includes('gel') || nameLower.includes('liquid') || nameLower.includes('ml') || nameLower.includes('1l');

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Soft ambient product lighting background */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-slate-950/80 to-slate-950" />
      
      <svg className="w-full h-full select-none" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft back radial spotlight */}
        <circle cx="160" cy="80" r="50" fill={scheme.liquid} opacity="0.1" filter="blur(20px)" />

        {isLiquid ? (
          /* ─── Transparent Liquid Bottle Drawing ─── */
          <g transform="translate(110, 15)">
            {/* Bottle body base */}
            <path d="M25,25 L75,25 Q85,25 85,35 L85,100 Q85,115 70,115 L30,115 Q15,115 15,100 L15,35 Q15,25 25,25 Z" fill={scheme.bottle} opacity="0.4" stroke={scheme.liquid} strokeWidth="1.5" />
            
            {/* Liquid level */}
            <path d="M16,50 Q50,45 84,50 L84,100 Q84,113 70,113 L30,113 Q16,113 16,100 Z" fill={scheme.liquid} opacity="0.75" />
            
            {/* Bubbles in liquid */}
            <circle cx="30" cy="65" r="2.5" fill="#ffffff" opacity="0.4" />
            <circle cx="45" cy="85" r="1.5" fill="#ffffff" opacity="0.6" />
            <circle cx="65" cy="60" r="3" fill="#ffffff" opacity="0.3" />
            <circle cx="70" cy="80" r="2" fill="#ffffff" opacity="0.5" />

            {/* Bottle neck */}
            <rect x="40" y="10" width="20" height="15" fill={scheme.bottle} opacity="0.5" stroke={scheme.liquid} strokeWidth="1" />
            {/* Cap */}
            <rect x="36" y="2" width="28" height="10" rx="1.5" fill={scheme.cap} />
            {/* Ridges on cap */}
            <line x1="42" y1="4" x2="42" y2="10" stroke="#000" strokeWidth="0.8" opacity="0.15" />
            <line x1="46" y1="4" x2="46" y2="10" stroke="#000" strokeWidth="0.8" opacity="0.15" />
            <line x1="50" y1="4" x2="50" y2="10" stroke="#000" strokeWidth="0.8" opacity="0.15" />
            <line x1="54" y1="4" x2="54" y2="10" stroke="#000" strokeWidth="0.8" opacity="0.15" />
            <line x1="58" y1="4" x2="58" y2="10" stroke="#000" strokeWidth="0.8" opacity="0.15" />

            {/* Bottle Handle */}
            <path d="M15,45 L5,45 Q0,45 0,55 L0,80 Q0,90 5,90 L15,90" stroke={scheme.liquid} strokeWidth="6" strokeLinecap="round" opacity="0.45" />

            {/* Premium Label */}
            <rect x="25" y="55" width="50" height="35" rx="2" fill={scheme.label} stroke={scheme.liquid} strokeWidth="0.8" />
            {/* Sparkles / Branding lines on label */}
            <path d="M35,62 L65,62" stroke={scheme.bottle} strokeWidth="2.5" opacity="0.75" />
            <path d="M30,72 L70,72" stroke={scheme.bottle} strokeWidth="1" opacity="0.5" />
            <path d="M30,78 L55,78" stroke={scheme.bottle} strokeWidth="1" opacity="0.5" />
            {/* Label Sparkle */}
            <polygon points="63,74 65,71 67,74 70,75 67,76 65,79 63,76 60,75" fill="#f59e0b" />
          </g>
        ) : (
          /* ─── Solid Detergent Soap Bar Drawing ─── */
          <g transform="translate(100, 30)">
            {/* Block shadow wrapper */}
            <rect x="15" y="15" width="100" height="65" rx="6" fill="#000" opacity="0.3" />
            {/* Primary soap bar block */}
            <rect x="10" y="10" width="100" height="65" rx="6" fill={scheme.liquid} stroke={scheme.cap} strokeWidth="2" />
            {/* Top lighting glossy highlight */}
            <path d="M15,14 L105,14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
            
            {/* Engraved logo / concentric ridges */}
            <rect x="25" y="22" width="70" height="41" rx="4" fill="none" stroke={scheme.bottle} strokeWidth="1.5" opacity="0.3" />
            <circle cx="60" cy="42" r="10" fill="none" stroke={scheme.bottle} strokeWidth="1.5" opacity="0.3" />
            {/* Bubble sparkles around */}
            <circle cx="20" cy="55" r="2" fill="#fff" opacity="0.5" />
            <circle cx="95" cy="25" r="3" fill="#fff" opacity="0.4" />
            <circle cx="102" cy="50" r="1.5" fill="#fff" opacity="0.6" />
          </g>
        )}

        {/* Ambient Soap Bubbles Floating in Sky */}
        <circle cx="50" cy="40" r="6" stroke="#ffffff" strokeWidth="0.8" opacity="0.2" fill="none" />
        <circle cx="53" cy="37" r="1.5" fill="#ffffff" opacity="0.2" />

        <circle cx="260" cy="110" r="8" stroke="#ffffff" strokeWidth="0.8" opacity="0.15" fill="none" />
        <circle cx="264" cy="106" r="2" fill="#ffffff" opacity="0.15" />

        <circle cx="270" cy="50" r="4" stroke="#ffffff" strokeWidth="0.8" opacity="0.2" fill="none" />
      </svg>
    </div>
  );
};

interface ProductTileProps {
  product: Product;
}

export const ProductTile: React.FC<ProductTileProps> = ({ product }) => {
  const navigate = useNavigate();

  return (
    <ItemTileLayout
      onClick={() => navigate(`/admin/product/${product.id}`)}
      illustration={<DetergentIllustration productId={product.id} productName={product.name} />}
      title={product.name}
      highlightText={`₹${parseFloat(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
      subtitle={
        <>
          <Package className="size-3 text-slate-500 shrink-0" />
          <span className="truncate">SKU: <strong className="font-mono text-slate-300">{product.sku || 'N/A'}</strong></span>
        </>
      }
      tags={
        <>
          {/* Catalog release tag */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-300">
            <Calendar className="size-3 text-teal-400" />
            <span>Active Catalog</span>
          </div>
        </>
      }
    />
  );
};
