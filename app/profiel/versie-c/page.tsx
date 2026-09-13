import type { Metadata } from "next"

import ProfileVersionC from "./_components/ProfileVersionC"

/**
 * Ontwerp C - "lidmaatschapskaart" - een vergelijkingskopie van /profiel.
 *
 * Alleen de Pro-weergave verschilt: de gelaagde ring om de avatar, het PRO-zegel,
 * de statusregel onder de naam en de lidmaatschapskaart in de Abonnement-kaart.
 * Alle overige inhoud en elke fetch is dezelfde als op app/profiel/page.tsx.
 *
 * Valt onder app/profiel/layout.tsx, dus dezelfde sessie-poort (GuestGate voor
 * gasten). Nooit geindexeerd en niet opgenomen in lib/pageMetadata.ts, zodat de
 * sitemap hem niet kent - hetzelfde als app/studies/versie-a|b|c.
 */
export const metadata: Metadata = {
  title: { absolute: "Profiel - ontwerp C (lidmaatschapskaart)" },
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ProfileVersionC />
}
