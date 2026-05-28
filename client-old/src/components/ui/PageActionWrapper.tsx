import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils.js';
import { MoreHorizontal } from 'lucide-react';

interface ActionConfig {
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  title?: string;
}

interface PageActionWrapperProps {
  children: React.ReactNode;
  action?: ActionConfig;
  className?: string;
}

// Global flag to configure the visual trigger pattern
// 'fab'         => Floating Action Button (FAB) at bottom-right aligned with safe-area
// 'three_dots'  => Reusable three-dots dropdown trigger overlay at the top-right
export const ACTION_TRIGGER_PATTERN: 'fab' | 'three_dots' = 'fab';

export const PageActionWrapper: React.FC<PageActionWrapperProps> = ({
  children,
  action,
  className,
}) => {
  const Icon = action?.icon;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Background page content */}
      {children}

      {/* Centralized Action Trigger */}
      {action && Icon && (
        ACTION_TRIGGER_PATTERN === 'fab' ? (
          <button
            onClick={action.onClick}
            className="hidden md:flex fixed bottom-24 right-6 z-40 items-center justify-center size-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none border-none cursor-pointer"
            title={action.title || action.label}
          >
            <Icon className="size-6 text-slate-950 font-extrabold" />
          </button>
        ) : (
          /* Centralized fully self-contained three-dots context menu overlay */
          <div className="absolute top-4 right-4 z-40" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-center size-9 rounded-xl bg-[#101512] hover:bg-[#151c18] border border-[#1a231f] hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all outline-none cursor-pointer"
              title="Page Actions"
            >
              <MoreHorizontal className="size-4.5" />
            </button>
            {isOpen && (
              <div className="absolute right-0 mt-2 min-w-[160px] bg-[#0c100e] border border-[#1a231f] rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    action.onClick();
                  }}
                  className="w-full flex items-center gap-2 text-left font-semibold text-xs text-slate-200 hover:text-slate-950 hover:bg-emerald-500 py-2.5 px-3 transition-colors border-none outline-none cursor-pointer"
                >
                  <Icon className="size-3.5" />
                  <span>{action.label}</span>
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
