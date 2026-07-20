// ── Jest setup file for the Sales App client ────────────────────────────────
// Runs in setupFiles array (after environment but before test files).
//
// IMPORTANT: Keep this file minimal and CJS-compatible where possible.
// The jest environment should provide expect/describe/it as globals.

// ── Extend expect with jest-native matchers ──────────────────────────────────
// @testing-library/jest-native must run AFTER expect is globally available.
// We wrap it in a try/catch because setupFiles in some jest-expo configs
// may not have expect available at this point.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { expect: globalExpect } = require("@jest/globals") as any;
  const extendExpect = require("@testing-library/jest-native/extend-expect");
  if (typeof extendExpect === "function") {
    extendExpect(globalExpect);
  }
} catch {
  // Fallback: if expect is a global, extend it directly
  if (typeof (globalThis as any).expect?.extend === "function") {
    try {
      const matchers = require("@testing-library/jest-native").default || require("@testing-library/jest-native");
      (globalThis as any).expect.extend(matchers);
    } catch {
      // If neither approach works, tests can still run without custom matchers
    }
  }
}

// ── Mocks ───────────────────────────────────────────────────────────────────

// react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// react-native-reanimated — must be mocked before anything imports it
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
      createAnimatedComponent: (component: any) => component,
      call: () => {},
    },
    useSharedValue: (init: any) => ({ value: init }),
    useDerivedValue: (fn: () => any) => ({ value: fn() }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: (val: any) => val,
    withSpring: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...vals: any[]) => vals,
    withDelay: (_delay: number, val: any) => val,
    cancelAnimation: () => {},
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    useReducedMotion: () => false,
    ReduceMotion: { Always: "always", Never: "never", System: "system" },
    Easing: {
      linear: () => 0,
      ease: () => 0,
      inOut: () => 0,
      out: () => 0,
    },
    FadeIn: { duration: () => 300 },
    FadeOut: { duration: () => 300 },
    SlideInRight: { duration: () => 300 },
    SlideOutLeft: { duration: () => 300 },
    ZoomIn: { duration: () => 300 },
    ZoomOut: { duration: () => 300 },
    interpolate: () => 0,
    interpolateColor: () => "#000000",
    Extrapolation: { CLAMP: "clamp" },
    Animated: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
    },
  };
});

// react-native-worklets — required by reanimated
jest.mock("react-native-worklets", () => ({
  useSharedValue: (init: any) => ({ value: init }),
  useDerivedValue: (fn: () => any) => ({ value: fn() }),
  useAnimatedStyle: () => ({}),
  withTiming: (val: any) => val,
  withSpring: (val: any) => val,
  runOnJS: (fn: any) => fn,
  makeMutable: (val: any) => ({ value: val }),
  createSerializable: (val: any) => val,
  createWorklet: (fn: any) => fn,
  WorkletsModule: {
    install: () => {},
    set: () => {},
  },
  serializableMappingCache: new Map(),
}));

// react-native-gesture-handler — bottom-sheet depends on it
jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    GestureHandlerRootView: View,
    FlatList: require("react-native").FlatList,
    ScrollView: require("react-native").ScrollView,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    NativeViewGestureHandler: View,
  };
});

// @gorhom/bottom-sheet
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, Modal, TouchableOpacity, FlatList } = require("react-native");

  const BottomSheetModal = React.forwardRef((props: any, ref: any) => {
    const [visible, setVisible] = React.useState(false);
    React.useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: () => setVisible(false),
      snapToIndex: () => {},
      snapToPosition: () => {},
      expand: () => {},
      close: () => setVisible(false),
      collapse: () => {},
      forceClose: () => setVisible(false),
    }));
    if (!visible) return null;
    return React.createElement(
      Modal,
      { visible, transparent: true, animationType: "slide" },
      React.createElement(
        TouchableOpacity,
        {
          style: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
          activeOpacity: 1,
          onPress: () => setVisible(false),
          testID: "bottom-sheet-backdrop",
        },
        React.createElement(
          View,
          {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#faf9f7",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: 20,
            },
            testID: "bottom-sheet-content",
          },
          props.children,
        ),
      ),
    );
  });

  return {
    BottomSheetModal,
    BottomSheetBackdrop: (props: any) => React.createElement(View, null),
    BottomSheetFlatList: FlatList,
    BottomSheetScrollView: require("react-native").ScrollView,
    BottomSheetView: View,
    BottomSheetTextInput: require("react-native").TextInput,
  };
});

// @expo/vector-icons
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const createIconSet =
    () =>
    (props: { name: string; size?: number; color?: string }) =>
      React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
  return {
    Ionicons: createIconSet(),
    MaterialIcons: createIconSet(),
    MaterialCommunityIcons: createIconSet(),
    FontAwesome: createIconSet(),
    FontAwesome5: createIconSet(),
    AntDesign: createIconSet(),
  };
});

// expo-font
jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  loadAsync: () => Promise.resolve(),
  isLoaded: () => true,
}));

// expo-router
jest.mock("expo-router", () => {
  const actualExpoRouter = jest.requireActual("expo-router");

  let cachedNavigation: any = null;

  const createMockNavigation = () => ({
    addListener: jest.fn().mockReturnValue(jest.fn()),
    setOptions: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    isFocused: jest.fn().mockReturnValue(true),
    getId: jest.fn(),
    getState: jest.fn(),
    getParent: jest.fn(),
  });

  return {
    ...actualExpoRouter,
    useNavigation: () => {
      if (!cachedNavigation) cachedNavigation = createMockNavigation();
      return cachedNavigation;
    },
    // Helper for tests to reset cached navigation between tests
    __resetNavigation: () => {
      cachedNavigation = null;
    },
    useSegments: () => [],
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
      navigate: jest.fn(),
      setParams: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    useGlobalSearchParams: () => ({}),
    usePathname: () => "",
    Link: ({ children }: any) =>
      require("react").createElement("Link", null, children),
    Stack: { Screen: ({ children }: any) => children },
    Tabs: { Screen: ({ children }: any) => children },
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
      navigate: jest.fn(),
    },
  };
});

// ── Silence noisy native module warnings ────────────────────────────────────

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("not a recognized") ||
    msg.includes("could not find the animated node")
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
