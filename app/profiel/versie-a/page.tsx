import type { Metadata } from "next"

import MidnightProfile from "./_components/MidnightProfile"

/**
 * /profiel - ontwerp A ("Midnight"): Pro als diepte en ingetogenheid.
 *
 * EEN BEOORDELINGS-URL, naast de echte /profiel. Zelfde gegevens, zelfde
 * bewerkingen; alleen de Pro-weergave (ring, PRO-merk, lidmaatschapspaneel)
 * verschilt. De layout van /profiel eromheen regelt sessie en gastscherm.
 *
 * Nooit geïndexeerd en niet in pageMetadata/sitemap - net als /studies/versie-*.
 * Verdwijnt zodra er een richting gekozen is.
 */
export const metadata: Metadata = {
  title: { absolute: "Profiel - ontwerp A (Midnight)" },
  robots: { index: false, follow: false },
}

export default function ProfielVersieAPage() {
  return <MidnightProfile />
}
