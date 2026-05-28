import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  recessed?: boolean;
}

export function Card({ recessed, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: recessed ? "#f8f7f4" : "#ffffff",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#f2f0ed",
          padding: 20,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
