import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))"
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))"
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))"
        },

        // ── Web platform design tokens (design_handoff_web/TOKENS.md) ──
        // The nine app routes are styled from these names only. Written as
        // literals that mirror the custom properties in app/globals.css, so
        // `bg-teal` and `background: var(--teal)` can never drift.
        //
        // `teal` is EXTENDED, not replaced: Tailwind deep-merges an extend
        // colour object, so teal-50..950 still resolve and the ~130 existing
        // `text-teal-600`-style classes elsewhere in the app keep working.
        // Only DEFAULT/dark/soft/faint/tint are added.
        teal: { DEFAULT: "#0D9488", dark: "#0F766E", soft: "#CCFBF1", faint: "#F0FDFA", tint: "#E6F5F1", bright: "#5EEAD4" },
        ink: { DEFAULT: "#111827", body: "#374151", muted: "#6B7280", faint: "#9CA3AF" },
        line: { DEFAULT: "#E5E7EB", strong: "#D1D5DB", soft: "#F3F4F6" },
        // Never white on gold: white on #CA9A16 is 2.6:1. Every gold surface
        // takes `gold-ink`.
        gold: { DEFAULT: "#CA9A16", ink: "#422E04", badge: "#7A5E08" },
        success: { DEFAULT: "#047857", fill: "#059669" },
        warn: { DEFAULT: "#EA580C", wash: "#FFF7ED" },
        danger: "#DC2626",
        scripture: "#1F2937",
        panel: { dark: "#152229" },
        heat: { 0: "#E5E7EB", 1: "#CCFBF1", 2: "#99D9CE", 3: "#4FB3A4", 4: "#0D9488" },
        bar: { empty: "#E5E7EB", read: "#9FD8CD", today: "#0F766E" },
        // Values TOKENS.md gives inside a gradient row or a page paragraph.
        pro: { pill: "#E6D2A0", ink: "#4A3506", badge: "#D9B95E", soft: "#FEF6E0" },
        sunken: "#F9FAFB",
        highlight: "#FEF3C7",
        badgering: { DEFAULT: "#7C3AED", wash: "#F5F3FF" },
        hill: { front: "#6C8C4E", back: "#3F6B3C" },

        // ── Lesson flow (design_handoff_web/TOKENS-LES.md) ──
        // These resolve through custom properties rather than literals, because
        // the lesson is the one surface that exists in two palettes: the same
        // class has to paint #FFFFFF on light and #0B1E1E on dark. The values
        // live in app/globals.css on `:root` and on `.dark`/[data-theme=dark].
        les: {
          bg: "var(--les-bg)",
          sb: "var(--les-sb)",
          line: "var(--les-line)",
          card: "var(--les-card)",
          "card-line": "var(--les-card-line)",
          ink: "var(--les-ink)",
          muted: "var(--les-muted)",
          faint: "var(--les-faint)",
          accent: "var(--les-accent)",
          scripture: "var(--les-scripture)",
          body: "var(--les-body)",
          "nav-active": "var(--les-nav-active)",
          "step-active": "var(--les-step-active)",
          quote: "var(--les-quote)",
          input: "var(--les-input)",
          check: "var(--les-check)",
          level: "var(--les-level)",
        }
      },
      backgroundImage: {
        verse: "linear-gradient(#4B3A63 0%,#7E5E6E 45%,#C88463 100%)",
        banner: "linear-gradient(135deg,#0F766E,#0F172A)",
        sky: "radial-gradient(circle at 50% 28%,#CFE9F2,#A9D7E4 70%)",
        "pro-pill": "linear-gradient(135deg,#F4DFA4,#FFFDF6)",
        "pro-badge": "linear-gradient(135deg,#CA9A16,#F2D98C 70%,#FFFBEF)",
        "tree-scene": "linear-gradient(#243A4A 0%,#3C5A60 42%,#5E7A63 74%,#2F4A3A 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "16px",
        btn: "10px",
        panel: "14px"
      },
      spacing: { sidebar: "196px", topbar: "64px" },
      boxShadow: {
        fab: "0 6px 16px rgba(13,148,136,.35)",
        badge: "0 1px 5px rgba(17,24,39,.22)",
        field: "0 1px 2px rgba(17,24,39,.04)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        lora: ["var(--font-lora)", "Georgia", "serif"],
        merriweather: ["var(--font-merriweather)", "Georgia", "serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        playfair: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.25s ease-out",
        // A whole panel rising into place, as opposed to `slide-up`'s 6px
        // settle. Used by the study flow's AI dock.
        "panel-up": "panelUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
        // The study flow's progress rail: the segment you just reached sweeps
        // in from its left edge instead of snapping to teal.
        "rail-fill": "railFill 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        panelUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        railFill: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
    }
  },
  plugins: [],
} satisfies Config;
