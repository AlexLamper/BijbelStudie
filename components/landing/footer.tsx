import Link from "next/link"
import Image from "next/image"

/**
 * Labels are inline rather than pulled through i18next. The site ships one
 * language (`languages = ["nl"]`), and this footer renders on the landing page
 * and on every content page - so `useTranslation` was dragging i18next, the
 * language detector, the resource backend and react-cookie onto the critical
 * path of the most-crawled routes in order to look up fourteen Dutch strings.
 */
export function Footer() {
  return (
    <footer style={{ backgroundColor: "#1F2937", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-14 lg:py-16">

        {/* Main grid. The reference pages (/bijbelstudie, /bijbelboeken,
            /hulpbronnen) are no longer advertised here - the footer sells the
            product, not the reading material around it. One link into
            /bijbelboeken survives on purpose: see the note beside it. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/images/icon-192.png" alt="BijbelStudie" width={22} height={22} className="rounded-md" />
              <span className="font-bold text-sm text-white">BijbelStudie</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
              Online bijbelstudie platform voor serieuze bijbelstudenten. Gratis beginnen, altijd.
            </p>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              {"Over BijbelStudie"}
            </h3>
            <ul className="space-y-2.5">
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
                    style={{ color: "#9CA3AF" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              {"Ondersteuning"}
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/inloggen",   label: "Inloggen" },
                { href: "/registreren", label: "Registreren" },
                { href: "/help",          label: "Help" },
                { href: "/contact",       label: "Contact" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#9CA3AF" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              {"Juridisch"}
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/privacybeleid",   label: "Privacybeleid" },
                { href: "/algemene-voorwaarden", label: "Servicevoorwaarden" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#9CA3AF" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            &copy; {new Date().getFullYear()} BijbelStudie. Alle rechten voorbehouden.
          </p>
          {/* Sister projects. Kept to one quiet line: these are the only
              outbound links on every public page, so they stay discoverable
              for crawlers without competing with the columns above. */}
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            Ook van ons:{" "}
            <a href="https://www.bijbelquiz.com" rel="noopener"
              className="transition-colors hover:text-white" style={{ color: "#9CA3AF" }}>
              BijbelQuiz
            </a>
            {" · "}
            <a href="https://www.bijbelapi.com" rel="noopener"
              className="transition-colors hover:text-white" style={{ color: "#9CA3AF" }}>
              BijbelAPI
            </a>
          </p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            Gemaakt door <span style={{ color: "#2DD4BF" }}>Alex Lamper</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
