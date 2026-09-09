import type { Metadata } from "next"
import DashboardGroeiringen from "../../../components/dashboard/variants/DashboardGroeiringen"

/**
 * Design candidate 14 of 15 for the dashboard, "Groeiringen". Behind the same
 * auth as /dashboard (middleware protects the prefix); kept out of the index
 * so a review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie14Page() {
  return <DashboardGroeiringen />
}
