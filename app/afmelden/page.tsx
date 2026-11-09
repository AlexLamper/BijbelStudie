import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "../../components/kit/primitives"
import { isEmailKind, verifyUnsubscribeToken } from "../../lib/emailPrefs"
import UnsubscribeButton from "./UnsubscribeButton"

export const metadata: Metadata = {
  title: "Afmelden voor e-mails | BijbelStudie",
  robots: { index: false, follow: false },
}

/**
 * /afmelden?u=&k=&t= - where a mail's "Deze soort uitzetten" and "Alle
 * e-mails uitzetten" links land.
 *
 * The page itself changes nothing (a link scanner opening it must not
 * unsubscribe anyone); the button POSTs to /api/email/unsubscribe with the
 * same signed parameters. No sign-in needed: the token is the authorisation.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; k?: string; t?: string }>
}) {
  const { u, k, t } = await searchParams
  const valid = verifyUnsubscribeToken(u, k, t) && isEmailKind(k)
  const what =
    k === "all"
      ? "alle e-mails van BijbelStudie, behalve wat je zelf aanvraagt (zoals een nieuw wachtwoord)"
      : "de e-mails die je krijgt als je een tijdje niet hebt gelezen"

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <Card className="w-full max-w-[460px] p-7">
        <p className="text-[15px] font-bold text-teal">BijbelStudie</p>
        <h1 className="mt-5 text-[21px] font-bold leading-[1.35] text-ink">Afmelden voor e-mails</h1>
        {valid ? (
          <>
            <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
              Hiermee zet je {what} uit. Je account en je voortgang blijven gewoon bestaan.
            </p>
            <UnsubscribeButton u={u as string} k={k as string} t={t as string} />
          </>
        ) : (
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
            Deze link werkt niet (meer). Je kunt e-mails altijd uitzetten bij{" "}
            <Link href="/instellingen" className="font-semibold text-teal">
              Instellingen
            </Link>
            .
          </p>
        )}
      </Card>
    </main>
  )
}
