import type { Metadata } from "next"
import LandingPage from "../components/landing/LandingPage"

export const metadata: Metadata = {
  title: "BijbelStudie - Online Bijbelstudie Platform",
  description:
    "Bestudeer de Bijbel systematisch met commentaren, leesplannen en bewezen studiemethoden. Gratis beginnen.",
}

export default function Page() {
  return <LandingPage />
}
