import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * Per-page Open Graph card.
 *
 * The site used to point every og:image at /og-image.svg. Facebook, LinkedIn,
 * WhatsApp, Slack and X all refuse SVG, so every share unfurled with no image
 * at all. This renders a real 1200x630 PNG per page.
 *
 * Lives at /og rather than /api/og on purpose: robots.txt disallows /api/, and
 * a disallowed og:image cannot be fetched by the crawlers that do honour it.
 */
export const runtime = "edge";

const TEAL = "#0D9488";
const INK = "#0F172A";
const MUTED = "#94A3B8";

/** Cheap guard against someone using this endpoint to render arbitrary text. */
function clamp(value: string | null, max: number): string {
  if (!value) return "";
  const trimmed = value.trim().slice(0, max);
  return trimmed.length < (value.trim().length ?? 0) ? `${trimmed}…` : trimmed;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title = clamp(searchParams.get("title"), 90) || "Bijbelstudie online";
  const subtitle = clamp(searchParams.get("subtitle"), 150);
  const eyebrow = clamp(searchParams.get("eyebrow"), 40) || "BijbelStudie";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F8FAFC",
          backgroundImage:
            "radial-gradient(circle at 88% 12%, rgba(13,148,136,0.18), transparent 45%), radial-gradient(circle at 4% 96%, rgba(13,148,136,0.12), transparent 42%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: TEAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Open-book glyph, drawn rather than fetched so the card never
                depends on a network round-trip at render time. */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 6.5C10.5 5 8.2 4.3 5 4.3v13.4c3.2 0 5.5.7 7 2.2 1.5-1.5 3.8-2.2 7-2.2V4.3c-3.2 0-5.5.7-7 2.2Z"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M12 6.5V20" stroke="#FFFFFF" strokeWidth="1.8" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: INK }}>
              BijbelStudie
            </span>
            <span style={{ fontSize: 19, color: MUTED, letterSpacing: 0.4 }}>
              {eyebrow}
            </span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: title.length > 52 ? 60 : 74,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 28,
                color: "#475569",
                lineHeight: 1.4,
                maxWidth: 940,
                display: "flex",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Footer rule + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #E2E8F0",
            paddingTop: 26,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 600, color: TEAL }}>
            www.bijbelstudie.io
          </span>
          <span style={{ fontSize: 24, color: MUTED }}>
            Gratis beginnen · Nederlandstalig
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cards are pure functions of the query string, so they can be cached
        // hard at the edge and by the social crawlers.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
