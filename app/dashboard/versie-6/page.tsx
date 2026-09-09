import type { Metadata } from "next"
import DashboardBoekenplank from "../../../components/dashboard/variants/DashboardBoekenplank"

/**
 * Design candidate 6 of 10 for the dashboard, "Boekenplank". Behind the same
 * auth as /dashboard (middleware protects the prefix); kept out of the index
 * so a review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie6Page() {
  return <DashboardBoekenplank />
}
