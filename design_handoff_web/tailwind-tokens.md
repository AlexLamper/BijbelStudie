# Tailwind-extensie

Als het project Tailwind gebruikt, hang de tokens hieraan op. Gebruik daarna uitsluitend deze namen — geen `text-[#0D9488]` in de pagina's.

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: '#0D9488', dark: '#0F766E', soft: '#CCFBF1', faint: '#F0FDFA', tint: '#E6F5F1' },
        ink:  { DEFAULT: '#111827', body: '#374151', muted: '#6B7280', faint: '#9CA3AF' },
        line: { DEFAULT: '#E5E7EB', strong: '#D1D5DB', soft: '#F3F4F6' },
        gold: { DEFAULT: '#CA9A16', ink: '#422E04', badge: '#7A5E08' },
        success: { DEFAULT: '#047857', fill: '#059669' },
        warn: '#EA580C',
        danger: '#DC2626',
        scripture: '#1F2937',
        panel: { dark: '#152229' },
      },
      backgroundImage: {
        verse: 'linear-gradient(#4B3A63 0%,#7E5E6E 45%,#C88463 100%)',
        banner: 'linear-gradient(135deg,#0F766E,#0F172A)',
        sky: 'radial-gradient(circle at 50% 28%,#CFE9F2,#A9D7E4 70%)',
        'pro-pill': 'linear-gradient(135deg,#F4DFA4,#FFFDF6)',
        'pro-badge': 'linear-gradient(135deg,#CA9A16,#F2D98C 70%,#FFFBEF)',
        'tree-scene': 'linear-gradient(#243A4A 0%,#3C5A60 42%,#5E7A63 74%,#2F4A3A 100%)',
      },
      borderRadius: { card: '16px', btn: '10px', panel: '14px' },
      spacing: { sidebar: '196px', topbar: '64px' },
      boxShadow: {
        fab: '0 6px 16px rgba(13,148,136,.35)',
        badge: '0 1px 5px rgba(17,24,39,.22)',
        field: '0 1px 2px rgba(17,24,39,.04)',
      },
      fontFamily: { sans: ['var(--font-inter)'], serif: ['var(--font-lora)'] },
    },
  },
}
```
