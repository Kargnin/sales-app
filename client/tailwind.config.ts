import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#fbfaf9",
        surface: "#ffffff",
        "surface-recessed": "#f8f7f4",
        "stone-border": "#f2f0ed",
        graphite: "#474645",
        charcoal: "#343433",
        ash: "#848281",
        midnight: "#121212",
        "ember-orange": "#ff3e00",
        success: "#00ca48",
        info: "#0090ff",
        warning: "#ffbb26",
      },
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
} satisfies Config;
