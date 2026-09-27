import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type { MetadataRoute } from "next";
import { BRONNEN, sectionPath, workPath, BRONNEN_PATH } from "./catalog";
import type { BronMeta, RawWork, WorkSummary } from "./types";

/**
 * Which works and sections exist, read synchronously from the data files and
 * without resolving any references - for generateStaticParams and the
 * sitemap, which only need the ids. Build time only, like ./load.ts.
 */

const DATA_DIR = path.join(process.cwd(), "lib", "content", "bronnen", "data");

/**
 * The date the Bronnen text last materially changed. Bump it when a data file
 * or the pages' copy changes (see the note at the top of app/sitemap.ts).
 */
export const BRONNEN_DATE = "2026-09-27";

/**
 * Bump when the RESOLVED payload changes without a data file changing - a
 * reference-parser fix, a new field on the wire. The app refetches a cached
 * work only when its `version` moves, and the version hashes this constant,
 * the catalogue entry and the raw file.
 */
export const BRONNEN_FORMAT = 1;

export interface PublishedWork {
  slug: string;
  sectionIds: string[];
  meta: BronMeta;
  raw: RawWork;
  version: string;
}

let cached: PublishedWork[] | null = null;

export function publishedWorks(): PublishedWork[] {
  if (cached) return cached;
  const out: PublishedWork[] = [];
  for (const meta of BRONNEN) {
    try {
      const text = readFileSync(path.join(DATA_DIR, `${meta.slug}.json`), "utf8");
      const raw = JSON.parse(text) as RawWork;
      if (Array.isArray(raw.sections) && raw.sections.length > 0) {
        const version = createHash("sha1")
          .update(`${BRONNEN_FORMAT}
${JSON.stringify(meta)}
${text}`)
          .digest("hex")
          .slice(0, 12);
        out.push({ slug: meta.slug, sectionIds: raw.sections.map(s => s.id), meta, raw, version });
      }
    } catch {
      // No data file yet: the work is not published.
    }
  }
  cached = out;
  return out;
}

export function publishedVersion(slug: string): string | null {
  return publishedWorks().find(w => w.slug === slug)?.version ?? null;
}

/** One index row, from the raw file alone: no Scripture text is resolved. */
export function workSummary(work: PublishedWork): WorkSummary {
  const { meta, raw } = work;
  return {
    ...meta,
    sectionNoun: raw.sectionNoun,
    sectionCount: raw.sections.length,
    questionCount: raw.sections.reduce((n, s) => n + s.blocks.filter(b => b.type === "qa").length, 0),
    version: work.version,
    sections: raw.sections.map(s => ({
      id: s.id,
      number: s.number ?? null,
      label: s.label,
      title: s.title ?? null,
    })),
  };
}

export function bronnenSitemapEntries(baseUrl: string): MetadataRoute.Sitemap {
  const lastModified = new Date(`${BRONNEN_DATE}T00:00:00Z`);
  const works = publishedWorks();
  if (works.length === 0) return [];
  return [
    { url: `${baseUrl}${BRONNEN_PATH}`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    ...works.flatMap(work => [
      { url: `${baseUrl}${workPath(work.slug)}`, lastModified, changeFrequency: "yearly" as const, priority: 0.7 },
      ...work.sectionIds.map(id => ({
        url: `${baseUrl}${sectionPath(work.slug, id)}`,
        lastModified,
        changeFrequency: "yearly" as const,
        priority: 0.5,
      })),
    ]),
  ];
}
