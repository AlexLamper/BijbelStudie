import type { Metadata } from "next"
import DashboardPad from "../../../components/dashboard/variants/DashboardPad"

/**
 * Design candidate 12 of 15 for the dashboard, "Pad". Behind the same auth as
 * /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie12Page() {
  return <DashboardPad />
}
