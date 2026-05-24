import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../lib/authOptions"
import LandingPage from "../components/landing/LandingPage"

export const metadata: Metadata = {
  title: "BijbelStudie - Online Bijbelstudie Platform",
  description:
    "Bestudeer de Bijbel systematisch met commentaren, leesplannen en bewezen studiemethoden. Gratis beginnen.",
}

export default async function Page() {
  // Server-side guard: logged-in users skip the marketing landing entirely.
  // Middleware already redirects, but this prevents any chance of the landing
  // page HTML being rendered for an authenticated session.
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    // ignore — treat as unauthenticated
  }
  if (session?.user) {
    redirect("/dashboard")
  }
  return <LandingPage />
}
