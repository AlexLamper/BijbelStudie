import type { Metadata } from "next"
import DashboardTweeluik from "../../../components/dashboard/variants/DashboardTweeluik"

/**
 * Design candidate 10 of 10 for the dashboard, "Tweeluik". Behind the same
 * auth as /dashboard (middleware protects the prefix); kept out of the index
 * so a review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie10Page() {
  return <DashboardTweeluik />
}
