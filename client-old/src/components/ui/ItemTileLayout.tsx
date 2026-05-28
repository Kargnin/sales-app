import React from 'react';
import { cn } from '../../lib/utils.js';

interface ItemTileLayoutProps {
  onClick: () => void;
  // Graphic/Illustration on the left on mobile, top on desktop
  illustration: React.ReactNode;
  // Optional badges positioned on top of the illustration (typically bottom-left on mobile, top-left on desktop)
  floatingBadges?: React.ReactNode;
  // Optional action button on top of the illustration (e.g. Favorite, Edit)
  floatingAction?: React.ReactNode;
  // Title text (e.g. Shop Name, Product Name)
  title: string;
  // Text for highlight badge (e.g. Price, outstanding amount)
  highlightText?: string;
  // Custom class for highlight badge
  highlightClassName?: string;
  // Secondary description/line (e.g. Address, SKU)
  subtitle?: React.ReactNode;
  // Additional tags/chips listed under the subtitle
  tags?: React.ReactNode;
  // Primary action buttons shown at the bottom
  bottomActions?: React.ReactNode;
  // Custom classes for the container
  className?: string;
}

export const ItemTileLayout: React.FC<ItemTileLayoutProps> = ({
  onClick,
  illustration,
  floatingBadges,
  floatingAction,
  title,
  highlightText,
  highlightClassName,
  subtitle,
  tags,
  bottomActions,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-row md:flex-col bg-[#0b0f0c] border border-[#17221b] hover:border-[#223328] rounded-2xl overflow-hidden transition-all duration-300 select-none shadow-md hover:shadow-lg hover:shadow-emerald-950/5 min-h-[145px] sm:min-h-[155px] md:min-h-0 md:h-auto cursor-pointer",
        className
      )}
    >
      {/* Graphic/Illustration Area */}
      <div className="relative w-[110px] sm:w-[130px] md:w-full md:aspect-[16/10] shrink-0 overflow-hidden border-r md:border-r-0 md:border-b border-[#131b15]">
        {illustration}

        {/* Floating Badges */}
        {floatingBadges && (
          <div className="absolute bottom-2 left-2 md:bottom-auto md:top-3 md:left-3 pointer-events-none z-10">
            <div className="pointer-events-auto flex gap-1">
              {floatingBadges}
            </div>
          </div>
        )}

        {/* Floating Action */}
        {floatingAction && (
          <div className="absolute top-2 right-2 md:top-3 md:right-3 z-10">
            {floatingAction}
          </div>
        )}

        {/* Shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Card Content Description Panel */}
      <div className="p-3 md:p-4 flex flex-col flex-1 min-w-0 justify-between">
        <div>
          {/* Name/Title and Value Row */}
          <div className="flex items-start justify-between gap-1.5 mb-0.5 md:mb-1">
            <h3 className="font-bold text-xs sm:text-sm md:text-[15px] leading-tight text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
              {title}
            </h3>
            {highlightText && (
              <span className={cn(
                "shrink-0 px-1.5 py-0.5 bg-[#e1fd52]/10 border border-[#e1fd52]/20 text-[#e1fd52] text-[8.5px] sm:text-[9.5px] md:text-[10px] font-extrabold tracking-wider rounded-md",
                highlightClassName
              )}>
                {highlightText}
              </span>
            )}
          </div>

          {/* Subtitle / Primary meta info */}
          {subtitle && (
            <div className="flex items-center gap-1 text-slate-400 text-[10px] sm:text-[11px] md:text-xs mb-1.5 md:mb-3">
              {subtitle}
            </div>
          )}

          {/* Horizontal tags/chips */}
          {tags && (
            <div className="flex flex-wrap items-center gap-1 md:gap-1.5 mb-2.5 md:mb-4 text-[8px] sm:text-[9px] md:text-[10px] font-bold tracking-wide">
              {tags}
            </div>
          )}
        </div>

        {/* Bottom actions drawer */}
        {bottomActions && (
          <div className="pt-1.5 md:pt-2 border-t border-[#131b15]">
            {bottomActions}
          </div>
        )}
      </div>
    </div>
  );
};
