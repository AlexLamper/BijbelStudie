import type { Metadata } from "next"
import DashboardGlas from "../../../components/dashboard/proef/versie-1/DashboardGlas"

/**
 * Dashboardontwerp 1 van 5, "Glas": the reader's landscape under everything,
 * with the navigation dissolved into a floating glass rail so nothing opaque
 * interrupts it. Behind the same auth as /dashboard (middleware protects the
 * /proefdashboard prefix) and kept out of the index so a review URL never leaks
 * into search.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function ProefdashboardVersie1Page() {
  return <DashboardGlas />
}
