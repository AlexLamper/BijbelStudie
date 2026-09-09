import type { Metadata } from "next"
import DashboardKaarten from "../../../components/dashboard/variants/DashboardKaarten"

/**
 * Design candidate 4 of 10 for the dashboard, "Kaarten". Behind the same auth
 * as /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie4Page() {
  return <DashboardKaarten />
}
