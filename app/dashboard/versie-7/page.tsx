import type { Metadata } from "next"
import DashboardKrant from "../../../components/dashboard/variants/DashboardKrant"

/**
 * Design candidate 7 of 10 for the dashboard, "Krant". Behind the same auth as
 * /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie7Page() {
  return <DashboardKrant />
}
