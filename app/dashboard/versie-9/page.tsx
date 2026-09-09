import type { Metadata } from "next"
import DashboardRust from "../../../components/dashboard/variants/DashboardRust"

/**
 * Design candidate 9 of 10 for the dashboard, "Rust". Behind the same auth as
 * /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie9Page() {
  return <DashboardRust />
}
