import type { Metadata } from "next"
import DashboardSterrenkaart from "../../../components/dashboard/variants/DashboardSterrenkaart"

/**
 * Design candidate 13 of 15 for the dashboard, "Sterrenkaart". Behind the same
 * auth as /dashboard (middleware protects the prefix); kept out of the index
 * so a review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie13Page() {
  return <DashboardSterrenkaart />
}
