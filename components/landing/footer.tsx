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
            <div className="flex items-center gap-2">
              <Image src="/images/icon-192.png" alt="BijbelStudie" width={22} height={22} className="rounded-md" />
              <span className="font-bold text-sm tracking-tight text-white">BijbelStudie</span>
            </div>
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
