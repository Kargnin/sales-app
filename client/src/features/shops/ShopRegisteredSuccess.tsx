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
const PROGRESS_BAR_MARGIN = 48;
const PROGRESS_BAR_MAX_WIDTH = SCREEN_WIDTH - PROGRESS_BAR_MARGIN;

interface ShopRegisteredSuccessProps {
  shopName: string;
  shopId: string;
  onAnimationComplete: () => void;
}

export function ShopRegisteredSuccess({
  shopName,
  shopId,
  onAnimationComplete,
}: ShopRegisteredSuccessProps) {
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();

  const callbackRef = useRef(onAnimationComplete);
  callbackRef.current = onAnimationComplete;

  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  const animDuration = isReducedMotion ? 0 : 300;
  const springConfig = isReducedMotion
    ? { damping: 1, stiffness: 1000 }
    : { damping: 15, stiffness: 120 };
  const staggerDelay = isReducedMotion ? 0 : 200;
  const progressDuration = isReducedMotion ? 0 : 2000;

  useEffect(() => {
    checkmarkScale.value = withSpring(1, springConfig);
    checkmarkOpacity.value = withTiming(1, { duration: animDuration });

    textOpacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: animDuration }),
    );

    progressWidth.value = withTiming(PROGRESS_BAR_MAX_WIDTH, {
      duration: progressDuration,
    });

    const timer = setTimeout(() => {
      callbackRef.current();
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

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

  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          className="w-20 h-20 rounded-full bg-success items-center justify-center mb-6"
          style={checkmarkStyle}
        >
          <Ionicons name="checkmark" size={40} color="#ffffff" />
        </Animated.View>

        <Animated.View style={textBlockStyle}>
          <Text variant="heading" color="charcoal" className="text-center mb-2">
            Shop Registered!
          </Text>
        </Animated.View>

        <Animated.View style={textBlockStyle}>
          <Text variant="body" color="ash" className="text-center">
            "{shopName}" has been submitted and is ready for field visits.
          </Text>
        </Animated.View>
      </View>

      <View className="mx-6 mb-12 h-1 bg-stone-border rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-success rounded-full"
          style={progressBarStyle}
        />
      </View>
    </View>
  );
}
