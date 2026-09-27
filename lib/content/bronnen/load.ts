import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getChapter } from "../../local-data";
import { parseSvChapter, type ParsedChapter } from "../../chapterPages";
import { readerBookName } from "../bibleBooks";
import { BRONNEN, getBronMeta } from "./catalog";
import { parseRefs } from "./refs";
import type {
  Block,
  RawBlock,
  RawWork,
  Ref,
  Section,
  Work,
} from "./types";

/**
 * Reads the Bronnen data files and resolves their Scripture references.
 *
 * BUILD TIME ONLY. Every page under /bronnen and both /api/v1/bronnen routes
 * are prerendered (force-static, dynamicParams false), so nothing here runs
 * per request - which matters on the Vercel CPU budget. The Statenvertaling
 * text comes from the same loader the /bijbel/<book>/<chapter> pages use.
 */

const DATA_DIR = path.join(process.cwd(), "lib", "content", "bronnen", "data");

/** Verses printed under one reference at most; longer passages link out. */
const MAX_VERSES_PER_REF = 12;

const chapterCache = new Map<string, Promise<ParsedChapter | null>>();

function svChapter(readerBook: string, chapter: number): Promise<ParsedChapter | null> {
  const key = `${readerBook}|${chapter}`;
  let hit = chapterCache.get(key);
  if (!hit) {
    hit = getChapter("statenvertaling", readerBook, chapter)
      .then(data => (data ? parseSvChapter(data.verses, chapter) : null))
      .catch(() => null);
    chapterCache.set(key, hit);
  }
  return hit;
}

async function resolveRefs(printed: string[] | undefined): Promise<Ref[] | undefined> {
  if (!printed || printed.length === 0) return undefined;
  const out: Ref[] = [];
  for (const entry of printed) {
    for (const parsed of parseRefs(entry)) {
      if (!("book" in parsed)) {
        out.push({ label: parsed.label });
        continue;
      }
      const readerBook = readerBookName(parsed.book);
      const ref: Ref = {
        label: parsed.label,
        book: parsed.book.slug,
        bookName: parsed.book.name,
        readerBook,
        chapter: parsed.chapter,
        verses: parsed.verses,
      };
      if (parsed.verses && parsed.verses.length <= MAX_VERSES_PER_REF) {
        const chapter = await svChapter(readerBook, parsed.chapter);
        const wanted = new Set(parsed.verses);
        const text = chapter?.verses.filter(v => wanted.has(v.n)) ?? [];
        if (text.length > 0) ref.text = text;
      }
      out.push(ref);
    }
  }
  return out;
}

async function resolveBlock(block: RawBlock): Promise<Block> {
  if (block.type === "heading") return block;
  const refs = await resolveRefs(block.refs);
  if (block.type === "qa") {
    const { type, number, question, answer } = block;
    return { type, number, question, answer, ...(refs ? { refs } : {}) };
  }
  const { type, number, text } = block;
  return { type, number, text, ...(refs ? { refs } : {}) };
}

async function readRaw(slug: string): Promise<RawWork | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw) as RawWork;
  } catch {
    return null;
  }
}

const workCache = new Map<string, Promise<Work | null>>();

/** The full work, references resolved, or null when there is no data file. */
export function loadWork(slug: string): Promise<Work | null> {
  let hit = workCache.get(slug);
  if (!hit) {
    hit = (async () => {
      const meta = getBronMeta(slug);
      const raw = meta ? await readRaw(slug) : null;
      if (!meta || !raw || !Array.isArray(raw.sections) || raw.sections.length === 0) return null;
      const sections: Section[] = [];
      for (const section of raw.sections) {
        const blocks: Block[] = [];
        for (const block of section.blocks) blocks.push(await resolveBlock(block));
        sections.push({
          id: section.id,
          number: section.number ?? null,
          label: section.label,
          title: section.title ?? null,
          blocks,
        });
      }
      return {
        ...meta,
        sectionNoun: raw.sectionNoun,
        source: raw.source,
        rights: raw.rights,
        sections,
      };
    })();
    workCache.set(slug, hit);
  }
  return hit;
}

/** Every published work, in catalogue order. */
export async function loadWorks(): Promise<Work[]> {
  const works = await Promise.all(BRONNEN.map(meta => loadWork(meta.slug)));
  return works.filter((w): w is Work => w !== null);
}
