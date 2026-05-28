import { View, ScrollView, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../lib/utils";

interface ScreenShellProps extends ViewProps {
  header?: React.ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function ScreenShell({
  header,
  scroll = true,
  className,
  contentClassName,
  children,
  style,
  ...props
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      className={cn("flex-1", contentClassName)}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );

  return (
    <View
      className={cn("flex-1 bg-canvas", className)}
      style={style}
      {...props}
    >
      {header}
      {content}
    </View>
  );
}
