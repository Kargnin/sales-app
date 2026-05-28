import { colors } from "./src/theme/colors";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ["Fraunces_500"],
        body: ["Inter_400"],
        "body-medium": ["Inter_500"],
        "body-semibold": ["Inter_600"],
      },
      spacing: {
        xs: "8",
        sm: "12",
        md: "24",
        lg: "32",
      },
      borderRadius: {
        DEFAULT: "10px",
        pill: "9999px",
      },
    },
  },
};
