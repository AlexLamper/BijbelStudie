import { getBookNameVariants, getBookNameFromNumber, CANONICAL_NL, BIBLE_BOOKS_ORDER, normalizeBookName } from './book-mapping';
import { headers } from 'next/headers';

// Interfaces
interface FlatVerse {
  book_name: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

interface Book {
    chapters?: Record<string, Record<string, string>>;
    [key: string]: Record<string, string> | Record<string, Record<string, string>> | undefined;
}

interface ManifestEntry {
    name: string;
    title?: string;
    language?: string;
    type: 'file' | 'dir';
    files?: string[]; // For dirs
}

interface Manifest {
    bibles: ManifestEntry[];
    commentaries: ManifestEntry[];
}

const CACHE: Record<string, { verses?: Record<string, string>; books?: Record<string, Book> } | FlatVerse[] | null> = {};
let MANIFEST_CACHE: Manifest | null = null;

function hasVerses(data: unknown): data is { verses: unknown } {
    return typeof data === 'object' && data !== null && 'verses' in data;
}

async function fetchJson(relativePath: string) {
    try {
        // Check if running on server (Node.js environment)
        if (typeof window === 'undefined') {
            try {
                const fsModule = await import('fs');
                const pathModule = await import('path');
                const fs = fsModule.default || fsModule;
                const path = pathModule.default || pathModule;

                if (fs && fs.existsSync && path && path.join && process && process.cwd) {
                    // Use filesystem directly since this runs on the server
                    const publicDir = path.join(process.cwd(), 'public');
                    // Remove leading slash if present to join correctly
                    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                    const filePath = path.join(publicDir, cleanPath);
                    
                    if (fs.existsSync(filePath)) {
                        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                        return JSON.parse(fileContent);
                    } else {
                        console.warn(`[LocalData] File not found on disk: ${filePath}. Falling back to HTTP fetch.`);
                        // Do NOT return null here. Allow fall-through to fetch() below.
                    }
                }
            } catch (err) {
                console.warn('[LocalData] FS access failed, falling back to fetch:', err);
            }
        }
        
        // Fallback for client-side or Edge runtime
        // Use relative URL for client-side fetch, or absolute for server-side fetch
        let urlStr = relativePath;
        if (typeof window === 'undefined') {
             let baseUrl = '';
             try {
                 const headersList = await headers();
                 const host = headersList.get('host');
                 const protocol = headersList.get('x-forwarded-proto') || 'https';
                 if (host) {
                     baseUrl = `${protocol}://${host}`;
                 }
             } catch {
                 // Not in request context or headers not available
             }

             if (!baseUrl) {
                 baseUrl = process.env.VERCEL_URL 
                    ? `https://${process.env.VERCEL_URL}` 
                    : 'http://localhost:3000';
             }
             
             urlStr = new URL(relativePath, baseUrl).toString();
        }

        const response = await fetch(urlStr, { cache: 'no-store' });
        
        if (!response.ok) {
            console.error(`Failed to fetch ${urlStr}: ${response.status} ${response.statusText}`);
            return null;
        }
        
        return await response.json();

    } catch (error) {
        console.error(`Error reading ${relativePath}:`, error);
        return null;
    }
}

async function getManifest(): Promise<Manifest> {
    if (MANIFEST_CACHE) return MANIFEST_CACHE;
    const manifest = await fetchJson('/data/manifest.json');
    if (manifest) {
        MANIFEST_CACHE = manifest;
        return manifest;
    }
    return { bibles: [], commentaries: [] };
}

let BOOKS_INDEX_CACHE: Record<string, string[]> | null = null;

async function getBooksIndex(): Promise<Record<string, string[]> | null> {
    if (BOOKS_INDEX_CACHE) return BOOKS_INDEX_CACHE;
    const index = await fetchJson('/data/books-index.json');
    if (index) {
        BOOKS_INDEX_CACHE = index;
        return index;
    }
    return null;
}

// Helper to find entry in manifest
async function findEntry(version: string) {
    const manifest = await getManifest();
    const versionKey = version.toLowerCase().replace(/\s+/g, '');

    // Check bibles
    let entry = manifest.bibles.find(e =>
        e.name.toLowerCase().replace(/[-_]/g, '').replace('.json', '') === versionKey.replace(/[-_]/g, '')
    );
    if (entry) return { ...entry, category: 'bibles' };

    // Check commentaries
    entry = manifest.commentaries.find(e =>
        e.name.toLowerCase().replace(/[-_]/g, '').replace('.json', '') === versionKey.replace(/[-_]/g, '')
    );
    if (entry) return { ...entry, category: 'commentaries' };

    return null;
}

export async function getBibleData(version: string, bookName?: string, chapter?: number) {
    const entry = await findEntry(version);
    if (!entry) return null;

    const cacheKey = `${version}-${bookName || 'full'}-${chapter || 'all'}`;
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    if (entry.type === 'file') {
        // Fetch full file
        const data = await fetchJson(`/data/${entry.category}/${entry.name}`);
        if (data) {
            CACHE[cacheKey] = data;
            return data;
        }
    } else if (entry.type === 'dir') {
        // Directory based (e.g. King Comments, Karl August Dachsel)
        if (bookName) {
            // Try to find the specific book file or folder
            const targetFile = entry.files?.find(f => {
                const fName = f.replace('.json', '').toLowerCase();
                return fName === bookName.toLowerCase() || getBookNameVariants(bookName).some(v => v.toLowerCase() === fName);
            });

            if (targetFile) {
                if (targetFile.endsWith('.json')) {
                    const data = await fetchJson(`/data/${entry.category}/${entry.name}/${targetFile}`);
                    if (data) {
                        // Wrap it to look like full data structure
                        const result = {
                            books: {
                                [targetFile.replace('.json', '')]: data
                            }
                        };
                        CACHE[cacheKey] = result;
                        return result;
                    }
                } else if (chapter) {
                    // It's a directory (e.g. 1Korinthe), fetch specific chapter file
                    // Pattern: BookName/BookNameChapter.json
                    const chapterFileName = `${targetFile}${chapter}.json`;
                    const data = await fetchJson(`/data/${entry.category}/${entry.name}/${targetFile}/${chapterFileName}`);
                    if (data) {
                        // Wrap it to look like full data structure
                        // The data is { "1": "text", "2": "text" } (verses)
                        const result = {
                            books: {
                                [targetFile]: {
                                    chapters: {
                                        [chapter.toString()]: data
                                    }
                                }
                            }
                        };
                        CACHE[cacheKey] = result;
                        return result;
                    }
                } else {
                    // Directory based, bookName present, but no chapter.
                    // Try to fetch chapters.json to list available chapters
                    const chaptersData = await fetchJson(`/data/${entry.category}/${entry.name}/${targetFile}/chapters.json`);
                    if (chaptersData && Array.isArray(chaptersData)) {
                         // chaptersData is [1, 2, 3]
                         const chaptersStub: Record<string, Record<string, string>> = {};
                         chaptersData.forEach(c => {
                             chaptersStub[c.toString()] = {};
                         });
                         
                         const result = {
                             books: {
                                 [targetFile]: { chapters: chaptersStub }
                             }
                         };
                         CACHE[cacheKey] = result;
                         return result;
                    }
                }
            }
        } else {
            // If no bookName, return a stub structure with empty books
            // This allows getBooks to work without fetching everything
            const booksStub: Record<string, Book> = {};
            entry.files?.forEach(f => {
                booksStub[f.replace('.json', '')] = {};
            });
            return { books: booksStub };
        }
    }
    return null;
}

export async function getBooks(version: string) {
    const entry = await findEntry(version);
    if (!entry) {
        return [];
    }

    // Try to use index first
    const index = await getBooksIndex();
    const indexKey = entry.name.replace('.json', '');
    
    if (index && index[indexKey]) {
        const books = [...index[indexKey]];
        
        // Sort books by canonical order
        books.sort((a, b) => {
            const aName = normalizeBookName(a);
            const bName = normalizeBookName(b);
            const aIndex = BIBLE_BOOKS_ORDER.indexOf(aName);
            const bIndex = BIBLE_BOOKS_ORDER.indexOf(bName);
            
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });

         // Translate to Dutch if version is HSV
        if (version.toLowerCase() === 'hsv') {
            return books.map(book => CANONICAL_NL[book] || book);
        }
        return books;
    }

    let books: string[] = [];

    if (entry.type === 'dir') {
        books = entry.files?.map(f => f.replace('.json', '')) || [];
    } else {
        // For single file, we must fetch it
        const data = await getBibleData(version);
        if (!data) {
            return [];
        }
        
        // Check for array of books (NBG51, Meyer)
        if (data.books && Array.isArray(data.books)) {
            books = data.books.map((b: { name?: string; bnumber?: number }) => {
                if (b.name) return b.name;
                if (b.bnumber) return getBookNameFromNumber(b.bnumber);
                return "Unknown";
            });
        } else if (Array.isArray(data)) {
            // Handle flat array structure
            const bookNames = new Set<string>();
            data.forEach((v: FlatVerse) => {
                if (v.book_name) {
                    bookNames.add(v.book_name);
                }
            });
            books = Array.from(bookNames);
        } else if (hasVerses(data) && Array.isArray(data.verses)) {
            const bookNames = new Set<string>();
            (data.verses as FlatVerse[]).forEach((v: FlatVerse) => {
                if (v.book_name) {
                    bookNames.add(v.book_name);
                }
            });
            books = Array.from(bookNames);
        } else {
            const booksData = (data as { books?: Record<string, Book> } | Record<string, Book>).books || (data as Record<string, Book>);
            const keys = Object.keys(booksData);
            books = keys.filter(k => k !== 'metadata' && k !== 'version' && k !== 'id' && k !== 'verses' && k !== 'meta');
        }
    }

    // Sort books by canonical order
    books.sort((a, b) => {
        const aName = normalizeBookName(a);
        const bName = normalizeBookName(b);
        const aIndex = BIBLE_BOOKS_ORDER.indexOf(aName);
        const bIndex = BIBLE_BOOKS_ORDER.indexOf(bName);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });

    // Translate to Dutch if version is HSV
    if (version.toLowerCase() === 'hsv') {
        return books.map(book => CANONICAL_NL[book] || book);
    }

    return books;
}

export async function getChapter(version: string, bookName: string, chapterNumber: number) {
    // Pass bookName and chapterNumber to getBibleData to optimize directory-based sources
    const data = await getBibleData(version, bookName, chapterNumber);
    if (!data) {
        return null;
    }

    const flatData = Array.isArray(data) ? data : (hasVerses(data) && Array.isArray(data.verses) ? data.verses : null);

    if (data.books && Array.isArray(data.books)) {
        // Handle array of books structure
        interface BookEntry {
            name?: string;
            bnumber?: number;
            chapters?: Array<{ number?: number; cnumber?: number; verses?: Array<{ number?: number; vnumber?: number; text: string }> }>;
        }
        const lowerBookName = bookName.toLowerCase();
        let book = data.books.find((b: BookEntry) => {
            if (b.name && b.name.toLowerCase() === lowerBookName) return true;
            if (b.bnumber) {
                const name = getBookNameFromNumber(b.bnumber);
                if (name.toLowerCase() === lowerBookName) return true;
            }
            return false;
        });

        if (!book) {
            const variants = getBookNameVariants(bookName);
            for (const variant of variants) {
                book = data.books.find((b: BookEntry) => {
                    if (b.name && b.name.toLowerCase() === variant.toLowerCase()) return true;
                    if (b.bnumber) {
                        const name = getBookNameFromNumber(b.bnumber);
                        if (name.toLowerCase() === variant.toLowerCase()) return true;
                    }
                    return false;
                });
                if (book) break;
            }
        }

        if (!book) return null;
        
        if (book.chapters && Array.isArray(book.chapters)) {
            interface ChapterEntry {
                number?: number;
                cnumber?: number;
                verses?: Array<{ number?: number; vnumber?: number; text: string }>;
            }
            const chapter = book.chapters.find((c: ChapterEntry) => (c.number || c.cnumber) === Number(chapterNumber));
            if (!chapter) return null;
            
            const versesMap: Record<string, string> = {};
            if (chapter.verses && Array.isArray(chapter.verses)) {
                chapter.verses.forEach((v: { number?: number; vnumber?: number; text: string }) => {
                    versesMap[(v.number || v.vnumber).toString()] = v.text;
                });
            }
            return { verses: versesMap };
        }
        return null;
    }

    if (flatData) {
        const lowerBookName = bookName.toLowerCase();
        let verses = (flatData as FlatVerse[]).filter(v => 
            v.book_name.toLowerCase() === lowerBookName && v.chapter === Number(chapterNumber)
        );
        
        if (verses.length === 0) {
             const variants = getBookNameVariants(bookName);
             for (const variant of variants) {
                 if (variant.toLowerCase() === lowerBookName) continue;
                 verses = (flatData as FlatVerse[]).filter(v => 
                    v.book_name.toLowerCase() === variant.toLowerCase() && v.chapter === Number(chapterNumber)
                );
                if (verses.length > 0) break;
             }
        }
        
        if (verses.length === 0) return null;
        
        const versesMap: Record<string, string> = {};
        verses.forEach(v => { versesMap[v.verse.toString()] = v.text; });
        return { verses: versesMap };
    } else {
        // Nested
        const booksData = (data as { books?: Record<string, Book> } | Record<string, Book>).books || (data as Record<string, Book>);
        // Find book key
        let bookKey = Object.keys(booksData).find(k => k.toLowerCase() === bookName.toLowerCase());
        if (!bookKey) {
            const variants = getBookNameVariants(bookName);
            for (const variant of variants) {
                bookKey = Object.keys(booksData).find(k => k.toLowerCase() === variant.toLowerCase());
                if (bookKey) break;
            }
        }
        if (!bookKey) return null;

        const book = booksData[bookKey];
        
        // Handle the case where book might be empty (if fetched via stub)
        // But getBibleData(version, bookName) should have fetched the real data
        if (!book || Object.keys(book).length === 0) return null;

        const chaptersObj = book.chapters || book;
        const chapterData = chaptersObj[chapterNumber.toString()] || chaptersObj[chapterNumber];
        
        if (!chapterData) return null;
        
        // Handle KingComments structure where verses might be directly in chapterData or nested
        const versesMap = chapterData.verses || chapterData;
        return { verses: versesMap };
    }
}

export async function getCommentary(source: string, bookName: string, chapterNumber: number) {
    const result = await getChapter(source, bookName, chapterNumber);
    return result ? result.verses : null;
}

export async function getCommentaries() {
    const manifest = await getManifest();
    return manifest.commentaries.map(c => ({
        id: c.name.replace('.json', ''),
        name: c.title || c.name.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        language: c.language || 'en'
    }));
}

export async function getBibleSummary(bookName: string, language: string = 'en') {
    try {
        const filename = language === 'nl' ? 'bible_summary_nl.json' : 'bible_summary.json';
        const summaryData = await fetchJson(`/data/${filename}`);
        if (!summaryData) return null;
        
        if (summaryData[bookName]) return summaryData[bookName];
        const variants = getBookNameVariants(bookName);
        for (const variant of variants) {
            if (summaryData[variant]) return summaryData[variant];
        }
        return null;
    } catch (e) {
        console.error('Error reading bible summary', e);
        return null;
    }
}

export async function getVersions() {
    const manifest = await getManifest();
    return manifest.bibles.map(b => ({
        id: b.name.replace('.json', ''),
        name: b.title || b.name.replace('.json', ''),
        language: b.language || 'en'
    }));
}

export async function getChapters(version: string, bookName: string) {
    const data = await getBibleData(version, bookName);
    if (!data) return [];

    const flatData = Array.isArray(data) ? data : (hasVerses(data) && Array.isArray(data.verses) ? data.verses : null);

    if (data.books && Array.isArray(data.books)) {
        // Handle array of books structure
        interface BookEntry {
            name?: string;
            bnumber?: number;
            chapters?: Array<{ number?: number; cnumber?: number; verses?: Array<{ number?: number; vnumber?: number; text: string }> }>;
        }
        const lowerBookName = bookName.toLowerCase();
        let book = data.books.find((b: BookEntry) => {
            if (b.name && b.name.toLowerCase() === lowerBookName) return true;
            if (b.bnumber) {
                const name = getBookNameFromNumber(b.bnumber);
                if (name.toLowerCase() === lowerBookName) return true;
            }
            return false;
        });

        if (!book) {
            const variants = getBookNameVariants(bookName);
            for (const variant of variants) {
                book = data.books.find((b: BookEntry) => {
                    if (b.name && b.name.toLowerCase() === variant.toLowerCase()) return true;
                    if (b.bnumber) {
                        const name = getBookNameFromNumber(b.bnumber);
                        if (name.toLowerCase() === variant.toLowerCase()) return true;
                    }
                    return false;
                });
                if (book) break;
            }
        }

        if (!book) return [];
        
        if (book.chapters && Array.isArray(book.chapters)) {
            return book.chapters.map((c: { number?: number; cnumber?: number }) => c.number || c.cnumber).sort((a: number, b: number) => a - b);
        }
        return [];
    }

    if (flatData) {
        const lowerBookName = bookName.toLowerCase();
        let bookVerses = (flatData as FlatVerse[]).filter(v => v.book_name.toLowerCase() === lowerBookName);
        
        if (bookVerses.length === 0) {
            const variants = getBookNameVariants(bookName);
            for (const variant of variants) {
                bookVerses = (flatData as FlatVerse[]).filter(v => v.book_name.toLowerCase() === variant.toLowerCase());
                if (bookVerses.length > 0) break;
            }
        }
        
        const chapters = new Set(bookVerses.map(v => v.chapter));
        return Array.from(chapters).sort((a, b) => a - b);
    } else {
        const booksData = (data as { books?: Record<string, Book> } | Record<string, Book>).books || (data as Record<string, Book>);
        let bookKey = Object.keys(booksData).find(k => k.toLowerCase() === bookName.toLowerCase());
        
        if (!bookKey) {
            const variants = getBookNameVariants(bookName);
            for (const variant of variants) {
                bookKey = Object.keys(booksData).find(k => k.toLowerCase() === variant.toLowerCase());
                if (bookKey) break;
            }
        }
        
        if (!bookKey) return [];
        
        const book = booksData[bookKey];
        const chaptersObj = book.chapters || book;
        return Object.keys(chaptersObj).map(Number).sort((a, b) => a - b);
    }
}
