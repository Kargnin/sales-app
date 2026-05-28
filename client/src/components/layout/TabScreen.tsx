import { View, ScrollView, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../lib/utils";

interface TabScreenProps extends ViewProps {
  header?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function TabScreen({
  header,
  className,
  contentClassName,
  children,
  style,
  ...props
}: TabScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn("flex-1 bg-canvas", className)}
      style={style}
      {...props}
    >
      {header}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 66 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View className={cn("flex-1", contentClassName)}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
