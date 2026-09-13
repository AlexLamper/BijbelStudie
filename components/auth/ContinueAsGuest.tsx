import Link from "next/link"
import { guestTarget } from "../../lib/guestTarget"

/**
 * The quiet way past the auth form: "of" and a secondary link into the app
 * without an account. Drawn for the night scene of /inloggen and /registreren,
 * so every colour is a literal (see app/inloggen/page.tsx).
 *
 * `next` is the raw parameter from the URL; lib/guestTarget validates it and
 * falls back to the studies when it points at an account-only page.
 */
export default function ContinueAsGuest({ next }: { next: string | null }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/15" />
        <span className="text-xs text-white/55">of</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>
      <Link
        href={guestTarget(next)}
        data-track="auth_continue_as_guest"
        className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white/80 no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
      >
        Doorgaan als gast
      </Link>
      <p className="-mt-2 text-center text-xs text-white/55">
        Zonder account lees je de Bijbel en volg je de studies. Je voortgang wordt niet bewaard.
      </p>
    </div>
  )
}
