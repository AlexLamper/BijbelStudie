// `/pure`: the plain entry point injects Stripe.js (~1 MB) the moment this
// module is imported, i.e. on every /abonnement view. `/pure` waits for
// loadStripe(), which only runs when a checkout starts.
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("Missing Stripe publishable key");
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export default getStripe;