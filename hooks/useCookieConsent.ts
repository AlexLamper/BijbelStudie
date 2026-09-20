"use client";

import { useEffect, useState } from "react";
import {
  readConsent,
  subscribeConsent,
  type ConsentRecord,
} from "../lib/cookieConsent";

interface ConsentState {
  /** False until the effect has run, so nothing renders or fires during SSR/hydration. */
  mounted: boolean;
  consent: ConsentRecord | null;
  analyticsAllowed: boolean;
}

/**
 * The reader's cookie choice, as React state.
 *
 * Starts as "not mounted, no consent" on every render path - the server and the
 * first client render therefore agree (nothing), which is what keeps the banner
 * out of the hydrated HTML and stops it flashing on each navigation.
 */
export function useCookieConsent(): ConsentState {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsentState] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    setConsentState(readConsent());
    setMounted(true);
    return subscribeConsent(() => setConsentState(readConsent()));
  }, []);

  return {
    mounted,
    consent,
    analyticsAllowed: consent?.status === "accepted",
  };
}

export default useCookieConsent;
