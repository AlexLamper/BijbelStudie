import Link from "next/link"
import { Card } from "../kit/primitives"

/**
 * What an account-bound page shows a visitor who has no account.
 *
 * The middleware used to bounce a guest from /dashboard, /notities, /profiel,
 * /instellingen, /groepen and /feedback straight back to "/" - which made every
 * one of those links in the sidebar a dead end for anyone trying the app before
 * signing up. Now the sidebar stays fully clickable and each of those routes
 * answers a guest with this card instead: one sentence on what the page does
 * once you are signed in, and the two ways to get there.
 *
 * It wears the redesign's own surfaces - a `Card` on the page ground, the teal
 * eyebrow, the 44 px primary button - so a guest lands in the same product a
 * signed-in reader is in, one card lighter. It used to be a glass tile on a
 * night landscape, which is the frame the app no longer has.
 *
 * Server-safe: no hooks, no state. The layout that renders it already knows
 * there is no session, and hands in the path to come back to as `next` - the
 * parameter app/inloggen and app/registreren read through lib/safeRedirect.
 *
 * Registreren is the primary action on purpose. A guest on this card has, by
 * definition, been using the product without an account; the thing they lack
 * is one, not a password they forgot.
 */
export default function GuestGate({
  title,
  description,
  next,
}: {
  /** The page's own name, as the sidebar shows it: "Notities", "Dashboard". */
  title: string
  /** One or two sentences on what this page does for a signed-in reader. */
  description: string
  /** The path to return to after signing in - normally the page itself. */
  next: string
}) {
  const target = encodeURIComponent(next)

  return (
    <section
      aria-labelledby="guest-gate-titel"
      className="flex min-h-full flex-col justify-center py-6"
    >
      <Card className="mx-auto w-full max-w-[34rem] p-7 sm:p-9">
        <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-teal">
          {title}
        </p>
        <h1
          id="guest-gate-titel"
          className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.5px] text-ink"
        >
          Dit onderdeel werkt met een account
        </h1>
        <p className="mt-4 text-[14.5px] leading-[1.7] text-ink-body">{description}</p>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-ink-body">
          Een account is gratis en in een minuut gemaakt. Alles wat je daarna leest en
          studeert wordt bewaard.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={`/registreren?next=${target}`}
            data-track="guest_gate_register"
            className="inline-flex h-11 items-center rounded-btn bg-teal px-[22px] text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            Gratis account maken
          </Link>
          <Link
            href={`/inloggen?next=${target}`}
            data-track="guest_gate_signin"
            className="inline-flex h-11 items-center rounded-btn border border-line px-[18px] text-[14px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft"
          >
            Ik heb al een account
          </Link>
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">
          Zonder account kun je gewoon verder: de{" "}
          <Link href="/studies" className="font-semibold text-teal underline-offset-4 hover:underline">
            studies
          </Link>{" "}
          en de{" "}
          <Link href="/lezen" className="font-semibold text-teal underline-offset-4 hover:underline">
            Bijbel
          </Link>{" "}
          zijn voor iedereen open.
        </p>
      </Card>
    </section>
  )
}
