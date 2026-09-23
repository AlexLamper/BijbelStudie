import getStripe from "./stripe-client"
import type { BillingInterval } from "./pricing"

/**
 * Starts a Stripe Checkout for the signed-in reader and leaves the page.
 *
 * Shared by /abonnement's plan cards and the Pro offer dialog, so there is one
 * way into checkout. The server decides everything that matters - the price,
 * the customer and whether the free trial applies (app/api/checkout) - the
 * client only says which interval.
 *
 * Resolves only if the redirect could not happen; throws an Error carrying a
 * Dutch message for the caller to show.
 */
export async function startCheckout(interval: BillingInterval): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interval }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Betaling mislukt")

  if (data.url) {
    window.location.assign(data.url)
    return
  }

  if (!data.sessionId) throw new Error("Geen sessie ontvangen")
  const stripe = await getStripe()
  if (!stripe) throw new Error("Stripe kon niet worden geladen")
  const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
  if (error) throw error
}

/** Where a guest goes to make an account first; /abonnement resumes the checkout from `?plan=`. */
export function signupForCheckoutHref(interval: BillingInterval): string {
  return `/registreren?next=${encodeURIComponent(`/abonnement?plan=${interval}`)}`
}
