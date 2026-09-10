import Link from "next/link"
import Image from "next/image"

/**
 * Labels are inline rather than pulled through i18next. The site ships one
 * language (`languages = ["nl"]`), and this footer renders on the landing page
 * and on every content page - so `useTranslation` was dragging i18next, the
 * language detector, the resource backend and react-cookie onto the critical
 * path of the most-crawled routes in order to look up fourteen Dutch strings.
 */
/**
 * Link colour. #9CA3AF on #1F2937 clears 4.5:1; the hover target is plain
 * white, so the state change is a real contrast step rather than a tint.
 */
const FOOTER_MUTED = "#9CA3AF"

/**
 * The halo behind the brand mark. Copied verbatim from `app/inloggen/BrandMark.tsx`,
 * which is the source of truth for this treatment - /inloggen, /registreren and
 * this footer must show the identical mark. Copied rather than imported: a
 * landing component may not reach into a route folder, and a shared component
 * would have to live somewhere neither owner controls. If one moves, move both.
 *
 * A plain radial gradient, not a blurred box: it is already soft, it costs no
 * filter pass and no banding, and it reaches full transparency at 78% - inside
 * its own box - so there is no visible ring.
 *
 * Unchanged for the lighter #1F2937 ground it lands on here. White at 0.26 over
 * #1F2937 resolves to #59616B, which is 2.45:1 against the #262626 tile (on the
 * auth pages' #0C2429 the same stop gives 2.03:1), so the mark is if anything
 * better separated here. Turning the centre stop up only starts a white blob.
 */
const MARK_GLOW =
  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.13) 42%, rgba(255,255,255,0.04) 66%, rgba(255,255,255,0) 78%)"

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#1F2937", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Matches the landing page's shell exactly, so the footer's outer margin
          lines up with every section above it instead of sitting 1rem wider. */}
      <div className="mx-auto w-full max-w-6xl xl:max-w-[76rem] px-5 sm:px-6 lg:px-8 py-16 lg:py-20">

        {/* Main grid. The reference pages (/bijbelstudie, /bijbelboeken,
            /hulpbronnen) are no longer advertised here - the footer sells the
            product, not the reading material around it. One link into
            /bijbelboeken survives on purpose: see the note beside it.

            The brand column is given more room than the three link columns:
            link lists are short words and read fine narrow, the sentence
            underneath the logo does not. */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">

          {/* Brand column */}
          <div className="space-y-4">
            {/* The full-colour mark, lifted off the ground by a halo instead of
                being swapped for an inverted asset.

                What was here was `Logo-text-dark-mode.svg`: the inverted
                lockup (light tile, dark cross, light lettering) drawn for this
                #1F2937 ground, because the real mark is a #262626 tile that
                sits at almost the same value as the footer and disappears into
                it. The mark is now the real one and the halo does that job.

                The light-mode lockup is deliberately NOT used here. Its
                lettering is one #262626 path, which is 1.09:1 on #1F2937 -
                invisible - and a halo scaled to the 26px mark cannot fix 92px
                of dark type beside it. So the lockup is split the way the
                header already splits it: the icon as artwork, the wordmark as
                white text. Same link, same 26px height. */}
            <Link href="/" className="inline-flex items-center gap-2" aria-label="BijbelStudie">
              <span className="relative inline-flex shrink-0">
                {/* Behind the mark, never over it: the halo is first in source
                    order and the image is given `relative` so it stacks above
                    without a z-index. Absolute, so it overflows the 26px box
                    by 7px on every side without moving anything. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-[7px] rounded-full"
                  style={{ background: MARK_GLOW }}
                />
                {/* No `rounded-*`: the tile carries its own corner radius and
                    the corners outside it are transparent, so the halo reads
                    through them. */}
                <Image
                  src="/images/logo.svg"
                  alt="BijbelStudie"
                  width={26}
                  height={26}
                  className="relative h-[26px] w-[26px]"
                />
              </span>
              <span className="text-base font-bold tracking-tight text-white">BijbelStudie</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed" style={{ color: FOOTER_MUTED }}>
              Online bijbelstudie platform voor serieuze bijbelstudenten. Gratis beginnen, altijd.
            </p>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white">
              {"Over BijbelStudie"}
            </h3>
            <ul className="space-y-3">
              {[
                { href: "/#about",    label: "Over ons" },
                { href: "/#features", label: "Functies" },
                { href: "/#pricing",  label: "Prijzen" },
                { href: "/#faq",      label: "FAQ" },
                { href: "/studies",   label: "Begeleide studies" },
                // The single internal link into the reference cluster. A sitemap
                // entry only tells Google a URL exists; it passes no authority
                // and no anchor text. Without one inbound link from a real page,
                // /bijbelboeken and the 66 book pages hanging off it are orphans
                // that slowly lose their rankings. This one line is what keeps
                // that cluster connected to the rest of the site.
                { href: "/bijbelboeken", label: "Bijbelboeken" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: FOOTER_MUTED }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white">
              {"Ondersteuning"}
            </h3>
            <ul className="space-y-3">
              {[
                { href: "/inloggen",   label: "Inloggen" },
                { href: "/registreren", label: "Registreren" },
                { href: "/help",          label: "Help" },
                { href: "/contact",       label: "Contact" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: FOOTER_MUTED }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white">
              {"Juridisch"}
            </h3>
            <ul className="space-y-3">
              {[
                { href: "/privacybeleid",   label: "Privacybeleid" },
                { href: "/algemene-voorwaarden", label: "Servicevoorwaarden" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: FOOTER_MUTED }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar. Three items on one justified row crowded into each other
            the moment any of them wrapped, so the copyright now anchors the
            left and the other two travel together on the right. */}
        <div className="mt-14 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: FOOTER_MUTED }}>
            &copy; {new Date().getFullYear()} BijbelStudie. Alle rechten voorbehouden.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            {/* Sister projects. Kept to one quiet line: these are the only
                outbound links on every public page, so they stay discoverable
                for crawlers without competing with the columns above. */}
            <p className="text-xs" style={{ color: FOOTER_MUTED }}>
              Ook van ons:{" "}
              <a href="https://www.bijbelquiz.com" rel="noopener"
                className="transition-colors hover:text-white" style={{ color: FOOTER_MUTED }}>
                BijbelQuiz
              </a>
              {" · "}
              <a href="https://www.bijbelapi.com" rel="noopener"
                className="transition-colors hover:text-white" style={{ color: FOOTER_MUTED }}>
                BijbelAPI
              </a>
            </p>
            <p className="text-xs" style={{ color: FOOTER_MUTED }}>
              Gemaakt door <span style={{ color: "#2DD4BF" }}>Alex Lamper</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
