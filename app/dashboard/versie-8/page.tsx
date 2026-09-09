import type { Metadata } from "next"
import DashboardPaneel from "../../../components/dashboard/variants/DashboardPaneel"

/**
 * Design candidate 8 of 10 for the dashboard, "Paneel". Behind the same auth
 * as /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie8Page() {
  return <DashboardPaneel />
}
