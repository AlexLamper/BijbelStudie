"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { trackNow } from "../../lib/analytics";

/**
 * Stripe's `cancel_url` lands here. The abandonment event is fired from the
 * client because this is the only place in the flow that knows a checkout was
 * started and not finished - Stripe sends no webhook for a session the user
 * simply walked away from.
 */
export default function CanceledClient({ interval }: { interval: "monthly" | "annual" }) {
  useEffect(() => {
    trackNow("checkout_abandoned", { interval });
  }, [interval]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Betaling geannuleerd</CardTitle>
          <CardDescription>Je abonnement is niet afgerond.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <p>Er is niets afgeschreven. Je kunt het opnieuw proberen wanneer je wilt.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Link href="/abonnement">
            <Button>Opnieuw proberen</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Naar dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
