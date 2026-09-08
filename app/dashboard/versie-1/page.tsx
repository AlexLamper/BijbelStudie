import type { Metadata } from "next"
import DashboardVandaag from "../../../components/dashboard/variants/DashboardVandaag"

/**
 * Design candidate 1 of 3 for the dashboard, "Vandaag". Behind the same auth
 * as /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie1Page() {
  return <DashboardVandaag />
}
