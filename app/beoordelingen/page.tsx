import type { Metadata } from "next";
import { Star } from "lucide-react";
import { PublicFrame } from "../../components/content/PublicFrame";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../lib/appStore";
import {
  getStoreReviewSummary,
  getPublicStoreReviews,
  type StoreReviewSummary,
  type PublicStoreReview,
} from "../../lib/storeReviews";
import { getPublicTestimonials, type PublicTestimonial } from "../../lib/testimonials";

/**
 * /beoordelingen - the review wall.
 *
 * TWO SOURCES, KEPT APART. The page shows store reviews (imported from the App
 * Store, `lib/storeReviews.ts`) and web testimonials (written by readers on
 * this site after finishing a study, published by hand, `lib/testimonials.ts`).
 * They are never merged into one list, and a testimonial never touches the
 * average or the count: that number means "the App Store rating" and has to
 * keep meaning exactly that. Each half gets its own heading and its own line of
 * context so a visitor can see which is which.
 *
 * Four rules hold this page together:
 *
 * 1. The average and the count are the true ones, over every imported review
 *    including the one-star ones. They come straight out of
 *    `getStoreReviewSummary()` and are never recomputed here from the cards
 *    below, which are filtered. Apple's marketing guidelines require a
 *    displayed App Store rating to be accurate, and a four-star-and-up average
 *    would not be. The page says out loud that the cards are a selection.
 * 2. Nothing is invented. No summary means no numbers - an honest line and a
 *    link to the store instead of a placeholder rating or a stock reviewer. A
 *    testimonial with no `name` runs without a credit line, never as "Anoniem":
 *    an empty display name means the reader was not asked to be named, not that
 *    they chose to hide.
 * 3. One empty state, not two. The store half keeps its honest "nog geen
 *    beoordelingen" card; the testimonial half renders nothing at all when
 *    there is nothing to show, because two stacked "hier staat niks" cards read
 *    as a broken page.
 * 4. ISR, not a query per visitor. Reviews trickle in; the database is read at
 *    most once an hour for everyone together (Vercel Active CPU is a standing
 *    constraint), and all three loaders run in one `Promise.all`.
 *
 * Deliberately no Review/AggregateRating JSON-LD: Google stopped showing
 * self-serving review rich results for an organisation's own product in 2019,
 * so it buys no stars in search and only risks a structured-data warning. This
 * page is built for readers.
 */
export const metadata: Metadata = generatePageMetadata("reviews");

export const revalidate = 3600;

/** Cards are a selection; the number above them is not. */
const MIN_CARD_RATING = 4;
const MAX_CARDS = 30;
const MAX_TESTIMONIALS = 12;

const PLATFORM_LABEL: Record<PublicStoreReview["platform"], string> = {
  ios: "App Store",
  android: "Google Play",
};

/**
 * Android is not shipped, so today this reads "de App Store". It follows
 * `PLAY_STORE_URL` rather than the reviews that happen to be imported, so the
 * heading cannot start claiming one store while `StoreLinks` offers two.
 */
const STORE_NAME = PLAY_STORE_URL === null ? "de App Store" : "de appstores";

const STARS = [5, 4, 3, 2, 1] as const;

function nl(n: number): string {
  return n.toLocaleString("nl-NL");
}

function average(n: number): string {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function reviewDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Five stars filled to the exact fraction - a gold row clipped over a grey
 * one. Rounding 4.4 up to five whole stars would overstate the rating by a
 * fifth of a star, which is the one thing this page may not do.
 */
function StarRow({ value, size }: { value: number; size: number }) {
  const filled = `${Math.max(0, Math.min(100, (value / 5) * 100))}%`;
  // `currentColor` rather than a literal per row, so the empty stars can take
  // a token that flips in dark mode.
  const stars = Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className="flex-none"
      style={{ width: size, height: size }}
      fill="currentColor"
      stroke="currentColor"
    />
  ));

  return (
    <span className="relative inline-flex flex-none" aria-hidden>
      <span className="flex text-bar-empty">{stars}</span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden"
        style={{ width: filled, color: "#E0A526" }}
      >
        {stars}
      </span>
    </span>
  );
}

function StoreLinks() {
  const linkClass =
    "inline-flex items-center rounded-[10px] border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold no-underline transition-colors hover:bg-sunken";

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        style={{ color: "#0D9488" }}
      >
        Alle beoordelingen in de App Store
      </a>
      {PLAY_STORE_URL !== null && (
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={{ color: "#0D9488" }}
        >
          Alle beoordelingen in Google Play
        </a>
      )}
    </div>
  );
}

function Summary({ summary }: { summary: StoreReviewSummary }) {
  return (
    <section className="rounded-card border border-line bg-surface px-4 py-[18px] sm:px-[22px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        <div className="flex flex-none flex-col items-start gap-1.5 sm:w-[136px] sm:items-center">
          <p className="text-[44px] font-bold leading-none tracking-[-1.5px] tabular-nums text-ink">
            {average(summary.average)}
          </p>
          <StarRow value={summary.average} size={17} />
          <p className="text-[12.5px] text-ink-muted">
            {nl(summary.count)} {summary.count === 1 ? "beoordeling" : "beoordelingen"}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
          {STARS.map((star) => {
            const n = summary.perStar[star] ?? 0;
            const share = summary.count > 0 ? (n / summary.count) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2.5">
                <span className="w-[62px] flex-none text-[12.5px] tabular-nums text-ink-muted">
                  {star} {star === 1 ? "ster" : "sterren"}
                </span>
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-line-soft" aria-hidden>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${share}%`, backgroundColor: "#0D9488" }}
                  />
                </span>
                <span className="w-9 flex-none text-right text-[12.5px] tabular-nums text-ink-muted">
                  {nl(n)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, showPlatform }: { review: PublicStoreReview; showPlatform: boolean }) {
  const date = reviewDate(review.submittedAt);
  const author = review.author.trim() || "Anoniem";
  const title = review.title.trim();
  const body = review.body.trim();

  const meta = [
    author,
    date,
    showPlatform ? PLATFORM_LABEL[review.platform] : null,
    review.appVersion ? `versie ${review.appVersion}` : null,
  ].filter(Boolean) as string[];

  return (
    <article className="rounded-card border border-line bg-surface px-4 py-[18px] sm:px-[22px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <StarRow value={review.rating} size={14} />
        <span className="sr-only">{review.rating} van de 5 sterren</span>
        {/* h3: the section heading above this list is the h2. */}
        {title && <h3 className="text-[15px] font-bold leading-6 text-ink">{title}</h3>}
      </div>
      {body && (
        <p className="mt-2 whitespace-pre-line break-words text-[13.5px] leading-[1.7] text-ink-body">
          {body}
        </p>
      )}
      <p className="mt-[10px] text-[12px] text-ink-faint">{meta.join(" · ")}</p>
    </article>
  );
}

/**
 * The one thing that separates the two halves of the page. Both get the same
 * treatment - a heading and a single line saying where these came from - so
 * neither reads as the footnote of the other.
 */
function SectionHead({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-4 px-1 pb-0.5 pt-3">
      <h2 className="text-[17px] font-bold tracking-[-0.3px] text-ink">{title}</h2>
      <p className="mt-1 text-[12.5px] leading-[1.6] text-ink-muted">{children}</p>
    </div>
  );
}

/**
 * A reader's quote from the site.
 *
 * No name line when `name` is null. The card must not fall back to "Anoniem":
 * the display name is a field the reader filled in or left empty, and leaving
 * it empty is not a request for anonymity - it is simply no credit. Printing
 * "Anoniem" would put a claim about their intent in their mouth.
 *
 * The date is `publishedAt`, which is when we put the quote up rather than when
 * it was written, so it is labelled as such instead of standing on its own.
 */
function TestimonialCard({ testimonial }: { testimonial: PublicTestimonial }) {
  const date = reviewDate(testimonial.publishedAt);
  const meta = [testimonial.name, date ? `geplaatst op ${date}` : null].filter(
    Boolean,
  ) as string[];

  return (
    <article className="rounded-card border border-line bg-surface px-4 py-[18px] sm:px-[22px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <StarRow value={testimonial.rating} size={14} />
        <span className="sr-only">{testimonial.rating} van de 5 sterren</span>
      </div>
      <p className="mt-2 whitespace-pre-line break-words text-[13.5px] leading-[1.7] text-ink-body">
        {testimonial.quote}
      </p>
      {meta.length > 0 && <p className="mt-[10px] text-[12px] text-ink-faint">{meta.join(" · ")}</p>}
    </article>
  );
}

export default async function ReviewsPage() {
  // All three loaders return null / [] on a database failure of their own
  // accord, so an unreachable database degrades to the empty state below, not a
  // 500. One `Promise.all`: three sequential awaits would be three round trips
  // on the render that misses the cache.
  const [summary, reviews, testimonials] = await Promise.all([
    getStoreReviewSummary(),
    getPublicStoreReviews({ minRating: MIN_CARD_RATING, limit: MAX_CARDS }),
    getPublicTestimonials({ limit: MAX_TESTIMONIALS }),
  ]);
  const showPlatform = new Set(reviews.map((r) => r.platform)).size > 1;

  // Only worth a jump list when both halves are actually there and the page is
  // long because of it. One section needs no navigation.
  const showAnchors = summary !== null && testimonials.length > 0;

  return (
    <PublicFrame
      eyebrow="Beoordelingen"
      title="Wat lezers ervan vinden"
      lead={`Beoordelingen uit ${STORE_NAME} en reacties die lezers op de website achterlieten. We tonen ze ongewijzigd en houden ze apart: een reactie van de website telt niet mee in het cijfer uit ${STORE_NAME}.`}
    >
      {showAnchors && (
        <nav aria-label="Op deze pagina" className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1">
          <a href="#appstore" className="text-[12.5px] font-semibold" style={{ color: "#0D9488" }}>
            Beoordelingen in {STORE_NAME}
          </a>
          <a href="#lezers" className="text-[12.5px] font-semibold" style={{ color: "#0D9488" }}>
            Reacties van lezers
          </a>
        </nav>
      )}

      <SectionHead id="appstore" title={`Beoordelingen in ${STORE_NAME}`}>
        Achtergelaten in {STORE_NAME} bij de BijbelStudie-app en daar opgehaald. Het gemiddelde gaat
        over alle beoordelingen, ook de lage.
      </SectionHead>

      {summary === null ? (
        <section className="rounded-card border border-line bg-surface px-4 py-[18px] sm:px-[22px]">
          <p className="text-[13.5px] leading-[1.7] text-ink-body">
            Er zijn nog geen beoordelingen opgehaald, dus staat hier geen cijfer. De BijbelStudie-app
            staat sinds augustus 2026 in de App Store: zodra lezers een beoordeling achterlaten,
            verschijnt die hier.
          </p>
          <div className="mt-3.5">
            <StoreLinks />
          </div>
        </section>
      ) : (
        <>
          <Summary summary={summary} />

          {reviews.length > 0 ? (
            <>
              <p className="px-1 pb-1 pt-1 text-[12.5px] leading-[1.6] text-ink-muted">
                Hieronder staan de beoordelingen van {MIN_CARD_RATING} sterren en hoger. Het
                gemiddelde en het aantal hierboven gaan over alle {nl(summary.count)}{" "}
                {summary.count === 1 ? "beoordeling" : "beoordelingen"}, ook de lagere; die lees je
                in de store.
              </p>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} showPlatform={showPlatform} />
              ))}
            </>
          ) : (
            <section className="rounded-card border border-line bg-surface px-4 py-[18px] sm:px-[22px]">
              <p className="text-[13.5px] leading-[1.7] text-ink-body">
                Er zijn nog geen beoordelingen van {MIN_CARD_RATING} sterren of hoger om te tonen.
                Het cijfer hierboven gaat over alle beoordelingen die er wel zijn.
              </p>
            </section>
          )}

          <div className="px-1 pt-2">
            <StoreLinks />
          </div>
        </>
      )}

      {/* Nothing at all when there is nothing to show - see rule 3 up top. */}
      {testimonials.length > 0 && (
        <>
          <SectionHead id="lezers" title="Reacties van lezers">
            Geschreven op de website na het afronden van een studie, door lezers die zelf hebben
            aangegeven dat we hun reactie mogen tonen. Ze tellen niet mee in het cijfer uit{" "}
            {STORE_NAME}.
          </SectionHead>
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </>
      )}
    </PublicFrame>
  );
}
