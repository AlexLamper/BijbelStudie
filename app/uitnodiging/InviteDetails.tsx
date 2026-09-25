"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { normaliseReferralCode, REFERRAL_REWARD_DAYS } from "../../lib/referralRules";
import { forgetInviteCode, rememberInviteCode } from "../../lib/inviteStorage";

const TEAL = "#0D9488";

/** "ABCD2345" → "ABCD 2345", easier to read over from one screen to another. */
function spaced(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

/**
 * The code-dependent half of /uitnodiging.
 *
 * Signed out: keep the code in this browser and send the visitor to sign up;
 * components/referral/ReferralClaim.tsx uses it once the account exists. The
 * code is also shown, for a visitor who would rather sign up in the app, where
 * it is typed in under Profiel.
 *
 * Signed in: offer to use it right here - the global claimer only runs when a
 * page first loads, which for this visitor has already happened.
 */
export default function InviteDetails() {
  const params = useSearchParams();
  const code = normaliseReferralCode(params.get("code"));
  // Needs the SessionProvider that app/uitnodiging/page.tsx mounts: the root
  // layout has none, and without one this returns undefined in a production
  // build.
  const { status, update } = useSession();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // The page is force-static, and a static render gets empty search params, so
  // the served HTML cannot know the code. Rendering before mount would put
  // "Deze uitnodiging klopt niet" in the HTML of every valid link and then fail
  // hydration once the browser read the real code; nothing is drawn until the
  // browser has it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (code && status === "unauthenticated") rememberInviteCode(code);
  }, [code, status]);

  async function claimHere() {
    if (!code) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/v1/referral/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (res.ok) {
        forgetInviteCode();
        setResult({ ok: true, message: "Je week Pro is gestart. Veel studieplezier!" });
        await update();
        router.refresh();
      } else {
        setResult({ ok: false, message: data?.message ?? "Dat lukte niet. Probeer het later opnieuw." });
      }
    } catch {
      setResult({ ok: false, message: "Dat lukte niet. Probeer het later opnieuw." });
    } finally {
      setClaiming(false);
    }
  }

  if (!mounted) return null;

  if (!code) {
    return (
      <>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Deze uitnodiging klopt niet</h1>
        <p className="mx-auto mt-2 text-sm leading-relaxed text-ink-muted">
          De link is niet compleet of niet meer geldig. Je kunt natuurlijk gewoon een gratis account maken.
        </p>
        <Link
          href="/registreren"
          className="press mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white no-underline"
          style={{ backgroundColor: TEAL }}
        >
          Gratis account maken
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Je bent uitgenodigd</h1>
      <p className="mx-auto mt-2 text-sm leading-relaxed text-ink-muted">
        Maak een gratis account aan bij Bijbel<span style={{ color: TEAL }}>Studie</span> en krijg{" "}
        {REFERRAL_REWARD_DAYS === 7 ? "een week" : `${REFERRAL_REWARD_DAYS} dagen`} Pro cadeau: Matthew Henry,
        Calvijn en Dachsel, de grondtekst en tot 200 AI-vragen per dag. Wie je uitnodigde krijgt er ook een week bij
        zodra je aan de slag gaat.
      </p>

      {status === "authenticated" ? (
        <div className="mt-8">
          {result ? (
            <p className={`text-sm font-semibold ${result.ok ? "text-teal" : "text-ink-muted"}`} role="status">
              {result.message}
            </p>
          ) : (
            <button
              type="button"
              onClick={claimHere}
              disabled={claiming}
              data-track="referral_claim_web"
              className="press inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {claiming ? "Bezig…" : "Uitnodiging gebruiken"}
            </button>
          )}
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-semibold no-underline"
            style={{ color: TEAL }}
          >
            Naar je dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-stretch gap-3">
          <Link
            href="/registreren"
            data-track="referral_invite_register"
            className="press inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white no-underline"
            style={{ backgroundColor: TEAL }}
          >
            Gratis account maken
          </Link>
          <Link
            href="/inloggen"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold text-ink no-underline"
          >
            Ik heb net een account gemaakt
          </Link>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-line bg-surface px-4 py-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">Je uitnodigingscode</p>
        <p className="mt-1 text-xl font-bold tracking-[0.12em] text-ink tabular-nums">{spaced(code)}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
          Liever de app? Maak daar een account aan en vul deze code in bij Profiel, binnen een week.
        </p>
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-ink-faint">
        De week Pro stopt vanzelf. Je betaalt niets en er wordt niets verlengd.
      </p>
    </>
  );
}
