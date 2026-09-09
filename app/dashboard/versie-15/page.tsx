import type { Metadata } from "next"
import DashboardBoomgaard from "../../../components/dashboard/variants/DashboardBoomgaard"

/**
 * Design candidate 15 of 15 for the dashboard, "Boomgaard". Behind the same
 * auth as /dashboard (middleware protects the prefix); kept out of the index
 * so a review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie15Page() {
  return <DashboardBoomgaard />
}
