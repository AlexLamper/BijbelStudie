"use client"

import { Header } from "../../../components/layout/header"
import NavigatieBalk from "../../../components/dashboard/proef/versie-5/NavigatieBalk"
import DashboardGeenRail from "../../../components/dashboard/proef/versie-5/DashboardGeenRail"

/**
 * Dashboardontwerp 5 - "Geen rail".
 *
 * Three parts, in the order they stack: the real navbar, exactly as every other
 * page renders it; the navigation belt that takes over what the sidebar used to
 * carry; and then the dashboard itself, which owns every pixel below them.
 *
 * The sidebar is not hidden, collapsed or hovered away here - it is gone, and
 * its destinations moved up into the navbar area. That is the point of this
 * candidate: with nothing docked to the left edge, the living scene is the full
 * width of the screen from the bottom of the chrome to the bottom of the page,
 * and the content earns its place on top of it instead of being fenced in
 * beside it.
 */
export default function Versie5Page() {
  return (
    <div className="relative min-h-screen bg-background">
      <Header title="Dashboard" />
      <NavigatieBalk />
      <DashboardGeenRail />
    </div>
  )
}
