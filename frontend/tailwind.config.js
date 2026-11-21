export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF8",
        surface: "#FFFFFF",
        primary: { DEFAULT: "#5C8A6E", dark: "#3D6B52" },
        "text-primary": "#1C2B2B",
        "text-secondary": "#6B7B7A",
        border: "#E5E9E6",
        error: "#C0392B",
        warning: "#D4830A",
        success: "#2E7D52",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
        input: "6px",
        pill: "50px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
