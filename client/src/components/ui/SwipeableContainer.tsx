import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwipeableContainerProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
  edgeBoundary?: number;
  touchAction?: "pan-y" | "pan-x" | "none" | "auto";
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

const swipeStyles = `
@keyframes tab-slide-in-right {
  from {
    transform: translateX(24px);
    opacity: 0;
    filter: blur(4px);
  }
  to {
    transform: translateX(0);
    opacity: 1;
    filter: blur(0px);
  }
}

@keyframes tab-slide-in-left {
  from {
    transform: translateX(-24px);
    opacity: 0;
    filter: blur(4px);
  }
  to {
    transform: translateX(0);
    opacity: 1;
    filter: blur(0px);
  }
}

.animate-tab-right {
  animation: tab-slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform, opacity, filter;
}

.animate-tab-left {
  animation: tab-slide-in-left 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform, opacity, filter;
}

@media (prefers-reduced-motion: reduce) {
  .animate-tab-right, .animate-tab-left {
    animation: none !important;
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
}
`;

export const SwipeableContainer: React.FC<SwipeableContainerProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 60,
  edgeBoundary = 25,
  touchAction = "pan-y",
  className,
  contentClassName,
  children,
}) => {
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const shouldIgnoreSwipe = (target: HTMLElement | null): boolean => {
    let curr: HTMLElement | null = target;
    while (curr) {
      // 1. Exclude Leaflet map interactions
      if (
        curr.classList.contains("leaflet-container") ||
        curr.classList.contains("leaflet-control") ||
        curr.classList.contains("leaflet-pane")
      ) {
        return true;
      }

      // 2. Exclude elements explicitly marked to ignore swipes
      if (
        curr.getAttribute("data-swipe-ignore") === "true" ||
        curr.getAttribute("data-swipe-gesture-ignore") === "true"
      ) {
        return true;
      }

      // 3. Exclude interactive controls
      const tagName = curr.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "option" ||
        tagName === "button"
      ) {
        return true;
      }

      curr = curr.parentElement;
    }
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (shouldIgnoreSwipe(target)) {
      return;
    }

    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;

    // Ignore gestures starting close to screen edges to allow native system back/forward swipes
    if (clientX < edgeBoundary || clientX > window.innerWidth - edgeBoundary) {
      return;
    }

    // Stop propagation to isolate nested swipe containers (e.g. order filters inside a dashboard)
    e.stopPropagation();

    touchStartX.current = clientX;
    touchStartY.current = clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    // Stop propagation to isolate nested swipe containers
    e.stopPropagation();

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    // Determine if gesture is primarily horizontal or vertical
    if (absDiffX > absDiffY) {
      // Horizontal swipe
      if (absDiffX > minSwipeDistance) {
        if (diffX > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (diffX < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    } else {
      // Vertical swipe
      if (absDiffY > minSwipeDistance) {
        if (diffY > 0 && onSwipeUp) {
          onSwipeUp();
        } else if (diffY < 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }

    // Reset touch coordinates
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleTouchCancel = (e: React.TouchEvent) => {
    e.stopPropagation();
    // Reset touch coordinates on system cancellation / interruption
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ touchAction }}
      className={cn("w-full transition-all duration-300", className)}
    >
      <style>{swipeStyles}</style>
      <div className={contentClassName}>{children}</div>
    </div>
  );
};
