import type { Metadata } from "next";

/**
 * Ontwerp B - "champagne" - van /profiel.
 *
 * Een beoordelings-URL naast de echte pagina. De sessie en de guest-gate komen
 * uit app/profiel/layout.tsx, dus hier alleen de metadata: nooit geïndexeerd, en
 * niet opgenomen in lib/pageMetadata.ts (waar de sitemap uit afleidt).
 */
export const metadata: Metadata = {
  title: { absolute: "Profiel - ontwerp B (champagne)" },
  robots: { index: false, follow: false },
};

export default function ProfielVersieBLayout({ children }: { children: React.ReactNode }) {
  return children;
}
