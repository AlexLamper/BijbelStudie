"use client";

import type { CSSProperties } from "react";
import { clearConsent } from "../../lib/cookieConsent";

/**
 * Reopens the cookiebanner by forgetting the stored choice. Withdrawing
 * consent must be as easy as giving it, so this sits in the footer and in the
 * privacy policy's cookie section. Declining afterwards also stops Google
 * Analytics and removes its cookies - see lib/googleAnalytics.ts.
 */
export default function CookieSettingsButton({
  className,
  style,
  label = "Cookie-instellingen",
}: {
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <button type="button" onClick={() => clearConsent()} className={className} style={style}>
      {label}
    </button>
  );
}
