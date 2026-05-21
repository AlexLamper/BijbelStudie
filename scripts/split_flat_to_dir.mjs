/**
 * Converts flat single-JSON Bible files to the per-book/per-chapter directory
 * structure used by the statenvertaling. Each book gets a folder with:
 *   - chapters.json  → [1, 2, ...]
 *   - {BookName}{N}.json → { "1": "text", "2": "text", ... }
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIBLES_DIR = join(__dirname, '..', 'public', 'data', 'bibles');

const TRANSLATIONS = [
  { jsonFile: 'heilige_schrift_1917.json', dirName: 'heilige_schrift_1917' },
  { jsonFile: 'canisiusbijbel.json',       dirName: 'canisiusbijbel' },
];

for (const { jsonFile, dirName } of TRANSLATIONS) {
  const srcPath = join(BIBLES_DIR, jsonFile);
  if (!existsSync(srcPath)) {
    console.warn(`Bestand niet gevonden, overgeslagen: ${jsonFile}`);
    continue;
  }

  console.log(`\nVerwerken: ${jsonFile}`);
  const { verses } = JSON.parse(readFileSync(srcPath, 'utf-8'));

  // Group: book → chapter → verse → text
  const books = new Map();
  for (const v of verses) {
    if (!books.has(v.book_name)) books.set(v.book_name, new Map());
    const chapters = books.get(v.book_name);
    if (!chapters.has(v.chapter)) chapters.set(v.chapter, {});
    chapters.get(v.chapter)[v.verse.toString()] = v.text;
  }

  const outDir = join(BIBLES_DIR, dirName);
  mkdirSync(outDir, { recursive: true });

  const bookList = [];

  for (const [bookName, chapters] of books) {
    const bookDir = join(outDir, bookName);
    mkdirSync(bookDir, { recursive: true });

    const chapterNums = [...chapters.keys()].sort((a, b) => a - b);

    // chapters.json
    writeFileSync(join(bookDir, 'chapters.json'), JSON.stringify(chapterNums), 'utf-8');

    // {BookName}{N}.json
    for (const [chapNum, versesMap] of chapters) {
      const chapFile = join(bookDir, `${bookName}${chapNum}.json`);
      writeFileSync(chapFile, JSON.stringify(versesMap), 'utf-8');
    }

    bookList.push(bookName);
    process.stdout.write('.');
  }

  console.log(`\n  ${bookList.length} boeken, klaar → ${dirName}/`);

  // Remove the flat source file
  rmSync(srcPath);
  console.log(`  Verwijderd: ${jsonFile}`);
}

console.log('\nGereed!');
