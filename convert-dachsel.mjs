/**
 * Converts 15 Karl August Dächsel EPUB commentary files into the
 * per-book / per-chapter JSON directory structure used by the app.
 *
 * Usage: node convert-dachsel.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname }                                      from 'path';
import { fileURLToPath }                                      from 'url';
import { createRequire }                                      from 'module';

const require = createRequire(import.meta.url);
const AdmZip  = require('adm-zip');

const __dir   = dirname(fileURLToPath(import.meta.url));
const EPUB_IN = join(__dir, 'public', 'data', 'commentaries', 'karl-august-dachsel');
const OUT     = join(__dir, 'public', 'data', 'commentaries', 'dachsel');

// ── EPUB → English book names (in reading order) ─────────────────
const EPUB_BOOKS = [
  { f: '1-dachsel-bijbelverklaring-genesis-exodus.epub',              books: ['Genesis','Exodus'] },
  { f: '2-dachsel-bijbelverklaring-leviticus-t-m-deuteronomium.epub', books: ['Leviticus','Numbers','Deuteronomy'] },
  { f: '3-dachsel-bijbelverklaring-jozua-t-m-2-samuel.epub',          books: ['Joshua','Judges','Ruth','1 Samuel','2 Samuel'] },
  { f: '4-dachsel-bijbelverklaring-1-koningen-t-m-esther.epub',       books: ['1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther'] },
  { f: '5-dachsel-job-t-m-psalm-80.epub',                             books: ['Job','Psalms'] },
  { f: '6-dachsel-psalm-81-t-m-hooglied.epub',                        books: ['Psalms','Proverbs','Ecclesiastes','Song of Solomon'] },
  { f: '7-dachsel-jesaja-en-jeremia.epub',                             books: ['Isaiah','Jeremiah'] },
  { f: '8-dachsel-klaagliederen-t-m-micha.epub',                      books: ['Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah'] },
  { f: '9-dachsel-nahum-t-m-maleachi.epub',                           books: ['Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'] },
  { f: '10-dachsel-mattheus.epub',                                     books: ['Matthew'] },
  { f: '11-dachsel-markus-lukas.epub',                                 books: ['Mark','Luke'] },
  { f: '12-dachsel-johannes.epub',                                     books: ['John'] },
  { f: '13-dachsel-handelingen-t-m-1-korinthe.epub',                  books: ['Acts','Romans','1 Corinthians'] },
  { f: '14-dachsel-2-korinthe-t-m-hebreeen.epub',                     books: ['2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews'] },
  { f: '15-dachsel-jacobus-t-m-openbaring.epub',                      books: ['James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'] },
];

// Single-chapter books that have no HOOFDSTUK heading in the EPUB
const SINGLE_CHAPTER_BOOKS = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

// Dutch heading text → English book name (longest/most-specific first to avoid false matches)
const BOOK_DETECT = [
  // Full title variants first (most specific)
  ['EERSTE BOEK VAN SAMUEL','1 Samuel'],
  ['TWEEDE BOEK VAN SAMUEL','2 Samuel'],
  ['DERDE BRIEF VAN DE APOSTEL JOHANNES','3 John'],
  ['TWEEDE BRIEF VAN DE APOSTEL JOHANNES','2 John'],
  ['2 SAMUEL','2 Samuel'],['1 SAMUEL','1 Samuel'],
  ['2 KONINGEN','2 Kings'],['1 KONINGEN','1 Kings'],
  ['2 KRONIEKEN','2 Chronicles'],['1 KRONIEKEN','1 Chronicles'],
  // NT letters: match full title variants first
  ['TWEEDE BRIEF VAN PAULUS AAN DE CORINTHI','2 Corinthians'],
  ['EERSTE BRIEF VAN PAULUS AAN DE CORINTHI','1 Corinthians'],
  ['TWEEDE BRIEF AAN DE CORINTHI','2 Corinthians'],
  ['EERSTE BRIEF AAN DE CORINTHI','1 Corinthians'],
  ['2 KORINTHE','2 Corinthians'],['1 KORINTHE','1 Corinthians'],
  ['BRIEF AAN DE GALATEN','Galatians'],
  ['BRIEF AAN DE EFEZI','Ephesians'],
  ['BRIEF AAN DE FILIPPENZEN','Philippians'],
  ['BRIEF AAN DE KOLOSSEN','Colossians'],
  ['TWEEDE BRIEF AAN DE THESSALONICENZEN','2 Thessalonians'],
  ['EERSTE BRIEF AAN DE THESSALONICENZEN','1 Thessalonians'],
  ['2 THESSALONICENZEN','2 Thessalonians'],['1 THESSALONICENZEN','1 Thessalonians'],
  ['TWEEDE BRIEF AAN TIMOTHEUS','2 Timothy'],['EERSTE BRIEF AAN TIMOTHEUS','1 Timothy'],
  ['2 TIMOTHEUS','2 Timothy'],['1 TIMOTHEUS','1 Timothy'],
  ['BRIEF AAN TITUS','Titus'],
  ['BRIEF AAN FILEMON','Philemon'],
  ['BRIEF AAN DE HEBREEEN','Hebrews'],['BRIEF AAN DE HEBREE','Hebrews'],
  ['2 PETRUS','2 Peter'],['1 PETRUS','1 Peter'],
  ['3 JOHANNES','3 John'],['2 JOHANNES','2 John'],['1 JOHANNES','1 John'],
  ['EERSTE BOEK VAN MOZES','Genesis'],
  ['TWEEDE BOEK VAN MOZES','Exodus'],
  ['DERDE BOEK VAN MOZES','Leviticus'],
  ['VIERDE BOEK VAN MOZES','Numbers'],
  ['VIJFDE BOEK VAN MOZES','Deuteronomy'],
  ['GENESIS','Genesis'],['EXODUS','Exodus'],['LEVITICUS','Leviticus'],
  ['NUMERI','Numbers'],['DEUTERONOMIUM','Deuteronomy'],
  ['JOZUA','Joshua'],['RICHTEREN','Judges'],['RUTH','Ruth'],
  ['ESTHER','Esther'],['EZRA','Ezra'],['NEHEMIA','Nehemiah'],['JOB','Job'],
  ['DE PSALMEN','Psalms'],['HET BOEK DER PSALMEN','Psalms'],
  ['SPREUKEN','Proverbs'],['PREDIKER','Ecclesiastes'],
  ['HOOGLIED','Song of Solomon'],['JESAJA','Isaiah'],['JEREMIA','Jeremiah'],
  ['KLAAGLIEDEREN','Lamentations'],['EZECHIEL','Ezekiel'],['EZECHI','Ezekiel'],
  ['DANIEL','Daniel'],['HOSEA','Hosea'],['JOEL','Joel'],['AMOS','Amos'],
  ['OBADJA','Obadiah'],['JONA','Jonah'],['MICHA','Micah'],['NAHUM','Nahum'],
  ['HABAKUK','Habakkuk'],['ZEFANJA','Zephaniah'],['HAGGAI','Haggai'],
  ['ZACHARIA','Zechariah'],['MALEACHI','Malachi'],
  ['MATTHEUS','Matthew'],['MATTH','Matthew'],
  ['MARKUS','Mark'],['LUKAS','Luke'],
  ['EVANGELIE VAN JOHANNES','John'],['JOHANNES','John'],
  ['HANDELINGEN','Acts'],['ROMEINEN','Romans'],
  ['GALATEN','Galatians'],['EFEZI','Ephesians'],
  ['FILIPPENZEN','Philippians'],['KOLOSSEN','Colossians'],
  ['TITUS','Titus'],['FILEMON','Philemon'],
  ['HEBREEEN','Hebrews'],['HEBREE','Hebrews'],
  ['JACOBUS','James'],['JAKOBUS','James'],['JUDAS','Jude'],['OPENBARING','Revelation'],
];

// Check if text (as book heading) starts with or is dominated by a known book pattern
function detectBook(text, expectedBooks) {
  const upper = text.toUpperCase().replace(/\s+/g,' ').trim();
  // Only look at the first 100 chars to avoid matching book names deep in body paragraphs
  const head  = upper.substring(0, 100);
  for (const [needle, book] of BOOK_DETECT) {
    if (head.includes(needle) && expectedBooks.includes(book)) return book;
  }
  return null;
}

// ── Convert a single paragraph's inner HTML → clean HTML string ───
function paraToHtml(inner) {
  let s = inner;
  // Strip koboSpan
  s = s.replace(/<span\s[^>]*class="koboSpan"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Semantic spans
  s = s.replace(/<span\s[^>]*class="none[12]?"[^>]*>([\s\S]*?)<\/span>/g, '<strong>$1</strong>');
  s = s.replace(/<span\s[^>]*class="none5"[^>]*>([\s\S]*?)<\/span>/g,
      (_, c) => `<strong style="font-size:.875em">${c}</strong>`);
  s = s.replace(/<span\s[^>]*class="none6"[^>]*>([\s\S]*?)<\/span>/g,
      (_, c) => `<strong><em>${c}</em></strong>`);
  s = s.replace(/<span\s[^>]*class="none7"[^>]*>([\s\S]*?)<\/span>/g,
      (_, c) => `<em>${c}</em>`);
  s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Entities
  s = s.replace(/&#160;/g,' ').replace(/&#8203;/g,'')
       .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
       .replace(/&quot;/g,'"').replace(/&#34;/g,'"');
  s = s.replace(/\s+/g,' ').trim();
  return s;
}

// ── Parse one XHTML file → array of {type, ...} tokens ───────────
function parseXhtml(raw, expectedBooks) {
  const body = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? raw;
  const tokens = [];

  // Process paragraph elements
  const paraRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = paraRe.exec(body)) !== null) {
    const inner = m[1];
    // Plain text of this paragraph (for detection)
    const plain = inner.replace(/<[^>]+>/g,'').replace(/&#160;/g,' ').replace(/\s+/g,' ').trim();
    if (!plain) continue;

    // Is this a CHAPTER heading? (text starts with "HOOFDSTUK \d+")
    const chapM = plain.match(/^HOOFDSTUK\s+(\d+)/);
    if (chapM) {
      tokens.push({ type: 'chapter', num: +chapM[1] });
      continue;
    }

    // Is this a BOOK heading? (check if it's a short heading-like line containing a known book name)
    // Only consider it a book heading if it's reasonably short (< 80 chars) and matches
    if (plain.length < 100) {
      const book = detectBook(plain, expectedBooks);
      if (book) {
        tokens.push({ type: 'book', name: book });
        continue;
      }
    }

    // Regular content paragraph
    const html = paraToHtml(inner);
    if (html) tokens.push({ type: 'content', html: `<p>${html}</p>` });
  }

  // Process list items (verse commentary sections)
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
  // We need to interleave <li> items at the right position in the body
  // Reprocess the full body for <li> elements only (they have their own structure)
  const liBody = body;
  while ((m = liRe.exec(liBody)) !== null) {
    const inner = m[1];
    const plain = inner.replace(/<[^>]+>/g,'').replace(/&#160;/g,' ').replace(/\s+/g,' ').trim();
    if (!plain) continue;
    const html = paraToHtml(inner);
    if (html) tokens.push({ type: 'li', html: `<li>${html}</li>` });
  }

  return tokens;
}

// ── Better approach: process body block-by-block in document order ─
function parseXhtmlOrdered(raw, expectedBooks) {
  const body = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? raw;
  const tokens = [];

  // Split into block elements (p and li) preserving document order
  // Use a combined regex
  const blockRe = /<(p|li)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = blockRe.exec(body)) !== null) {
    const [, tag, , inner] = m;
    const plain = inner.replace(/<[^>]+>/g,'').replace(/&#160;/g,' ').replace(/&#34;/g,'"').replace(/\s+/g,' ').trim();
    if (!plain) continue;

    if (tag === 'p') {
      // Chapter heading detection: "HOOFDSTUK X" where the ENTIRE remainder of the
      // paragraph contains NO lowercase letters.
      // — True headings: "HOOFDSTUK 1. OVER HET GELUK..." (all uppercase) ✓
      // — Cross-refs:   "HOOFDSTUK 1 Vs. 3 beschrijft..." (lowercase "beschrijft") ✗
      const chapM = plain.match(/^HOOFDSTUK\s+(\d+)([\s\S]*)?$/);
      if (chapM) {
        const rest = (chapM[2] ?? '').trim();
        // Accept only when no lowercase letter appears in the remainder
        if (!/[a-záéíóúèàäëïöüœæ]/.test(rest)) {
          tokens.push({ type: 'chapter', num: +chapM[1], isPsalm: false }); continue;
        }
      }

      // Psalm chapter heading: "PSALM X." followed by uppercase description
      // Only valid within Psalms book context — tagged isPsalm:true so grouper can filter
      const psM = plain.match(/^PSALM\s+(\d+)\.\s+[A-Z]/);
      if (psM) { tokens.push({ type: 'chapter', num: +psM[1], isPsalm: true }); continue; }

      // Book heading detection — ONLY for all-uppercase, short, standalone paragraphs
      // with NO verse references (e.g. "1:3") to exclude inline Bible citations.
      if (plain.length <= 120
          && !/[a-záéíóúèàäëïöüœæ]/.test(plain)   // no lowercase
          && !/\d+:\d+/.test(plain))                // no verse refs like "1:3"
      {
        const book = detectBook(plain, expectedBooks);
        if (book) { tokens.push({ type: 'book', name: book }); continue; }
      }

      // Regular paragraph
      const html = paraToHtml(inner);
      if (html) tokens.push({ type: 'content', html: `<p>${html}</p>` });
    } else {
      // <li> = verse commentary entry
      const html = paraToHtml(inner);
      if (html) tokens.push({ type: 'content', html: `<li>${html}</li>` });
    }
  }
  return tokens;
}

// ── Wrap consecutive <li> in <ol> in an HTML string ──────────────
function wrapLists(html) {
  return html
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ol>${m}</ol>`)
    .replace(/<\/ol>\s*<ol>/g, '');
}

// ── Process one EPUB → {bookName: Map<chapNum, string>} ──────────
function processEpub(epubPath, expectedBooks) {
  const zip = new AdmZip(epubPath);

  // Get all content XHTML files from the ZIP (alphabetically sorted).
  // Skip title/nav pages AND index_split_000 (Calibre always puts cover/titlepage there)
  const SKIP = /(?:nav|toc|titlepage|cover|index_split_000)\.x?html$/i;
  let xhtmlNames = zip.getEntries()
    .filter(e => /\.x?html$/i.test(e.entryName) && !SKIP.test(e.entryName))
    .sort((a,b) => a.entryName.localeCompare(b.entryName))
    .map(e => e.entryName);
  // If nothing found, fall back to all xhtml files
  if (!xhtmlNames.length) {
    xhtmlNames = zip.getEntries()
      .filter(e => /\.x?html$/i.test(e.entryName))
      .sort((a,b) => a.entryName.localeCompare(b.entryName))
      .map(e => e.entryName);
  }

  // Collect all tokens across all XHTML files in order
  const allTokens = [];
  for (const name of xhtmlNames) {
    const entry = zip.getEntry(name) ?? zip.getEntries().find(e => e.entryName.endsWith(name));
    if (!entry) continue;
    try {
      const raw = entry.getData().toString('utf-8');
      allTokens.push(...parseXhtmlOrdered(raw, expectedBooks));
    } catch { /* skip */ }
  }

  // Group tokens into {book → {chapter → html[]}}
  //
  // Book transitions are detected by TWO reliable structural signals:
  //   1. Chapter 1 reappears after chapter 1 has already been seen in the current book
  //      (every Bible book starts at chapter 1 → a second "chapter 1" means new book)
  //   2. A non-Psalm chapter appears after Psalm-format chapters ended (Psalms → Proverbs)
  //
  // This avoids relying on book-name detection in text (too many false positives).
  const bookData     = {};
  let curBookIdx     = 0;
  let curBook        = expectedBooks[0] ?? null;
  let curChapter     = null;
  let seenChapter1   = false;  // have we seen chapter 1 in the current book?

  if (curBook) bookData[curBook] = new Map();

  for (const tok of allTokens) {
    // ── Book title token (all-uppercase, short paragraph with known book name) ──
    if (tok.type === 'book') {
      const newIdx = expectedBooks.indexOf(tok.name);
      const curIdx = curBook ? expectedBooks.indexOf(curBook) : -1;
      // Only accept FORWARD transitions (adjacent book, not skipping multiple)
      if (newIdx === curIdx + 1) {
        curBookIdx   = newIdx;  // keep curBookIdx in sync with book-heading transitions
        curBook      = tok.name;
        curChapter   = null;
        seenChapter1 = false;
        if (!bookData[curBook]) bookData[curBook] = new Map();
        // Single-chapter books have no HOOFDSTUK heading; auto-set chapter 1.
        // Do NOT set seenChapter1=true to avoid a spurious chapReset on the next ch-1 token.
        if (SINGLE_CHAPTER_BOOKS.has(curBook)) {
          curChapter = 1;
          bookData[curBook].set(1, []);
        }
      }
      continue;
    }

    if (tok.type === 'chapter') {
      // ── Book transition detection (BEFORE the isPsalm guard) ──
      const hasMoreBooks  = curBookIdx + 1 < expectedBooks.length;
      // Signal 1: chapter 1 reappears → new book
      const chapReset     = tok.num === 1 && seenChapter1;
      // Signal 2: significant chapter-number decrease (e.g. Exodus starts at ch 2)
      const chapDecrease  = curChapter !== null && curChapter >= 10
                          && tok.num <= Math.max(2, curChapter / 8);
      // Signal 3: non-Psalm chapter after Psalm section (Psalms → Proverbs)
      const psalmExit     = curBook === 'Psalms' && !tok.isPsalm;

      if (hasMoreBooks && (chapReset || chapDecrease || psalmExit)) {
        curBookIdx++;
        curBook      = expectedBooks[curBookIdx];
        curChapter   = null;
        seenChapter1 = false;
        if (!bookData[curBook]) bookData[curBook] = new Map();
      }

      // Psalm chapters only valid inside Psalms (check AFTER potential transition)
      if (tok.isPsalm && curBook !== 'Psalms') continue;

      // Set chapter
      curChapter = tok.num;
      if (tok.num === 1) seenChapter1 = true;
      if (curBook) {
        if (!bookData[curBook]) bookData[curBook] = new Map();
        if (!bookData[curBook].has(curChapter)) bookData[curBook].set(curChapter, []);
      }
    } else if (tok.type === 'content') {
      if (curBook && curChapter !== null) {
        bookData[curBook].get(curChapter).push(tok.html);
      }
    }
  }

  return bookData;
}

// ── Main ──────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const psalmMap = new Map();

for (const { f: epubFile, books: expectedBooks } of EPUB_BOOKS) {
  const epubPath = join(EPUB_IN, epubFile);
  if (!existsSync(epubPath)) { console.warn(`SKIP: ${epubFile}`); continue; }

  const label = epubFile.replace(/^\d+-dachsel-bijbelverklaring-|-dachsel-/g,'').replace('.epub','');
  process.stdout.write(`\nVerwerken: ${label}\n`);

  const bookData = processEpub(epubPath, expectedBooks);

  for (const [book, chapMap] of Object.entries(bookData)) {
    if (!chapMap?.size) continue;

    if (book === 'Psalms') {
      for (const [k,v] of chapMap) psalmMap.set(k,v);
      process.stdout.write(`  Psalmen +${chapMap.size} hfst (${psalmMap.size} totaal)\n`);
      continue;
    }

    const bookDir = join(OUT, book);
    mkdirSync(bookDir, { recursive: true });
    const nums = [...chapMap.keys()].sort((a,b)=>a-b);
    writeFileSync(join(bookDir,'chapters.json'), JSON.stringify(nums), 'utf-8');

    for (const [num, parts] of chapMap) {
      const raw  = parts.join('\n');
      const html = wrapLists(raw).replace(/<p>\s*<\/p>/g,'').trim();
      writeFileSync(join(bookDir,`${book}${num}.json`), JSON.stringify({'1': html}), 'utf-8');
    }
    process.stdout.write(`  ${book}: ${nums.length} hfst\n`);
  }
}

// Flush Psalms
if (psalmMap.size) {
  const bookDir = join(OUT, 'Psalms');
  mkdirSync(bookDir, { recursive: true });
  const nums = [...psalmMap.keys()].sort((a,b)=>a-b);
  writeFileSync(join(bookDir,'chapters.json'), JSON.stringify(nums), 'utf-8');
  for (const [num, parts] of psalmMap) {
    const raw  = parts.join('\n');
    const html = wrapLists(raw).replace(/<p>\s*<\/p>/g,'').trim();
    writeFileSync(join(bookDir,`Psalms${num}.json`), JSON.stringify({'1': html}), 'utf-8');
  }
  process.stdout.write(`\n  Psalmen totaal: ${nums.length} hfst\n`);
}

// Summary
const books = readdirSync(OUT, { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => e.name).sort();
console.log(`\nKlaar! ${books.length} boeken weggeschreven.`);
console.log('Boeken:', books.join(', '));
