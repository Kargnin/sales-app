import { useRef, useEffect } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/ui/text";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PROGRESS_BAR_MARGIN = 48; // 24px on each side (mx-6)
const PROGRESS_BAR_MAX_WIDTH = SCREEN_WIDTH - PROGRESS_BAR_MARGIN;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductAddedSuccessProps {
  /** Displayed in the body text (unused in this design, but available). */
  productName: string;
  /** ID used for navigation to the detail screen. */
  productId: string;
  /** Called after 2 seconds when the animation completes. */
  onAnimationComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * An animated full-screen celebration shown after a product is created.
 *
 * Staggers three animations:
 *  1. Checkmark circle: spring scale + fade-in (immediate)
 *  2. Text block:       fade-in (slightly delayed)
 *  3. Progress bar:     width grows from 0 to full over 2 seconds
 *
 * After the 2-second timer elapses `onAnimationComplete` is invoked, which
 * should navigate away (typically with `router.replace`).
 *
 * When `useReducedMotion()` is true all animation durations are set to 0 so
 * the UI appears instantly while still respecting the 2-second feedback delay.
 */
export function ProductAddedSuccess({
  productName: _productName,
  productId: _productId,
  onAnimationComplete,
}: ProductAddedSuccessProps) {
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();

  // Ref avoids stale closures in the setTimeout callback.
  const callbackRef = useRef(onAnimationComplete);
  callbackRef.current = onAnimationComplete;

  // ----- Reanimated shared values -----
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // ----- Duration helpers -----
  const animDuration = isReducedMotion ? 0 : 300;
  const springConfig = isReducedMotion
    ? { damping: 1, stiffness: 1000 }
    : { damping: 15, stiffness: 120 };
  const staggerDelay = isReducedMotion ? 0 : 200;
  const progressDuration = isReducedMotion ? 0 : 2000;

  useEffect(() => {
    // 1. Checkmark enters immediately
    checkmarkScale.value = withSpring(1, springConfig);
    checkmarkOpacity.value = withTiming(1, { duration: animDuration });

    // 2. Text fades in with a slight stagger
    textOpacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: animDuration }),
    );

    // 3. Progress bar fills over the full duration
    progressWidth.value = withTiming(PROGRESS_BAR_MAX_WIDTH, {
      duration: progressDuration,
    });

    // 4. Callback after the full 2-second window
    const timer = setTimeout(() => {
      callbackRef.current();
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Animated styles -----
  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  const textBlockStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  // ----- Render -----
  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* -- Centered content -- */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Animated checkmark circle */}
        <Animated.View
          className="w-20 h-20 rounded-full bg-success items-center justify-center mb-6"
          style={checkmarkStyle}
        >
          <Ionicons name="checkmark" size={40} color="#ffffff" />
        </Animated.View>

        {/* Heading */}
        <Animated.View style={textBlockStyle}>
          <Text variant="heading" color="charcoal" className="text-center mb-2">
            Product Added!
          </Text>
        </Animated.View>

        {/* Body */}
        <Animated.View style={textBlockStyle}>
          <Text variant="body" color="ash" className="text-center">
            Your new product is now part of the catalog.
          </Text>
        </Animated.View>
      </View>

      {/* -- Progress bar (bottom area) -- */}
      <View className="mx-6 mb-12 h-1 bg-stone-border rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-success rounded-full"
          style={progressBarStyle}
        />
      </View>
    </View>
  );
}
