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
            {/* `/images/logo.svg` is a #262626 tile (near-black) with a
                #F9F9F9 cross - drawn for a light page, where it reads fine.
                On this #1F2937 footer the tile sits within a hair of the
                background (contrast ~1.1:1) and all but disappears, leaving
                a faint cross floating with no visible tile around it - not
                legible, not professional.

                Rather than shipping a second logo asset to keep in sync with
                the real one, `invert(1)` flips it at render time: the tile
                becomes a light ~#D9D9D9 (9.5:1 on this background) and the
                cross becomes near-black - the same "light tile, dark cross"
                treatment this footer used to use as a dedicated dark-mode
                svg, without a second file to maintain. Scoped to this one
                <Image>, so the mark is unaffected everywhere else it renders
                (navbar, header, sidebar - all on light grounds).

                The wordmark is not part of that asset - it is plain text
                here, so it just stays white, same as the header splits it. */}
            <Link href="/" className="inline-flex items-center gap-2" aria-label="BijbelStudie">
              <Image
                src="/images/logo.svg"
                alt="BijbelStudie"
                width={26}
                height={26}
                className="h-[26px] w-[26px]"
                style={{ filter: "invert(1)" }}
              />
              <span className="text-base font-bold tracking-tight text-white">
                Bijbel<span style={{ color: "#0D9488" }}>Studie</span>
              </span>
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
                // These three used to point at "/#about", "/#features" and
                // "/#pricing" - anchors that never existed on the landing
                // page (its real section ids are "in-actie", "prijzen" and
                // "faq"; there is no "about" section at all), so they were
                // dead links that just landed on "/". "Over ons" is dropped
                // rather than repointed - there is no about-us content
                // anywhere on the site to send it to.
                { href: "/#in-actie", label: "Functies" },
                { href: "/#prijzen",  label: "Prijzen" },
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
                { href: "/account-verwijderen", label: "Account verwijderen" },
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
