import type { Metadata } from "next"
import DashboardOverzicht from "../../../components/dashboard/variants/DashboardOverzicht"

/**
 * Design candidate 2 of 3 for the dashboard, "Overzicht". Behind the same
 * auth as /dashboard (middleware protects the prefix); kept out of the index
 * so a review URL never leaks into search. See components/dashboard/variants.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default function DashboardVersie2Page() {
  return <DashboardOverzicht />
}
