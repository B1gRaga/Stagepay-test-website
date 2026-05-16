import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // StagePay brand palette
        emerald:   { DEFAULT: "#10B981" },
        "deep-navy": "#060A12",
        bg2:       "#0C1220",
        surface:   "#131B2E",
        danger:    "#EF4444",
        warn:      "#F59E0B",
        info:      "#3B82F6",

        // shadcn CSS-variable tokens (required by button.tsx)
        background:           "hsl(var(--background))",
        foreground:           "hsl(var(--foreground))",
        primary: {
          DEFAULT:            "hsl(var(--primary))",
          foreground:         "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:            "hsl(var(--secondary))",
          foreground:         "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:            "hsl(var(--destructive))",
          foreground:         "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT:            "hsl(var(--accent))",
          foreground:         "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT:            "hsl(var(--muted))",
          foreground:         "hsl(var(--muted-foreground))",
        },
        border:               "hsl(var(--border))",
        input:                "hsl(var(--input))",
        ring:                 "hsl(var(--ring))",
      },
      fontFamily: {
        heading: ["var(--font-bebas)", "sans-serif"],
        serif:   ["var(--font-instrument)", "serif"],
        sans:    ["var(--font-archivo)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}

export default config
