import type { Metadata } from "next"
import DashboardReis from "../../../components/dashboard/variants/DashboardReis"

/**
 * Design candidate 3 of 3 for the dashboard, "Reis". Behind the same auth as
 * /dashboard (middleware protects the prefix); kept out of the index so a
 * review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie3Page() {
  return <DashboardReis />
}
