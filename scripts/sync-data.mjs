// scripts/sync-data.mjs
//
// Pulls licensed/restricted text from a PRIVATE GitHub repo at build time and
// writes it into ./private so it is baked into the Vercel deployment WITHOUT
// ever being committed to this repo or served as a public static asset.
// lib/local-data.ts reads ./private before ./public, server-side only.
//
// Two parts of the data repo are taken:
//   - data/<GITHUB_DATA_FILES>  -> private/data/bibles/   (NBG-vertaling 1951)
//   - bijbelstudie/**           -> private/**             (same paths as /data here:
//       bijbelstudie/data/bibles/net/... -> private/data/bibles/net/...)
//     NET Bible, Schlachter 2000 and KingComments live there. Anything not in the
//     public domain (or openly licensed) goes there, never under public/data.
// BijbelAPI syncs only data/, so bijbelstudie/ never reaches its public API.
//
// One request only: the GitHub tarball API. We never fetch per-file (rate limits).
//
// Vercel pattern chosen: BUILD-TIME sync (package.json "prebuild").
//   - Vercel's runtime filesystem is read-only (only /tmp, wiped on cold start),
//     so we materialise the data during the build and read it with fs at runtime.
//   - next.config.ts `outputFileTracingIncludes` forces ./private into the
//     serverless bundles that read it (dynamic fs reads aren't auto-traced).
//
// Env:
//   GITHUB_TOKEN        (required on Vercel) fine-grained read on the data repo
//   GITHUB_DATA_REPO    default AlexLamper/bijbelapi-data
//   GITHUB_DATA_BRANCH  default main
//   GITHUB_DATA_SUBDIR  default data         (only files under this dir are taken)
//   GITHUB_DATA_FILES   default nbg51.json   (comma-separated basenames; "*"=all)
//   GITHUB_DATA_DEST    default private/data/bibles   (where files land locally)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const REPO   = process.env.GITHUB_DATA_REPO   || 'AlexLamper/bijbelapi-data';
const BRANCH = process.env.GITHUB_DATA_BRANCH || 'main';
const SUBDIR = (process.env.GITHUB_DATA_SUBDIR || 'data').replace(/\/+$/, '');
const DEST   = process.env.GITHUB_DATA_DEST   || 'private/data/bibles';
const TOKEN  = process.env.GITHUB_TOKEN;
const FILES  = (process.env.GITHUB_DATA_FILES ?? 'nbg51.json')
  .split(',').map(s => s.trim()).filter(Boolean);
const ALL    = FILES.length === 0 || FILES.includes('*');
const MIRROR_SUBDIR = 'bijbelstudie';
const MIRROR_DEST   = 'private';

const UA = 'bijbelstudie-sync-data';

function log(msg) { console.log(`[sync-data] ${msg}`); }

// Minimal POSIX/ustar tar reader. Long paths come either split over the ustar
// prefix field or in a pax 'x' header that applies to the next entry.
function readStr(buf, start, len) {
  let end = start;
  const max = Math.min(start + len, buf.length);
  while (end < max && buf[end] !== 0) end++;
  return buf.toString('utf8', start, end);
}

// pax records are "<len> <key>=<value>\n", len counting the whole record.
function paxPath(buf) {
  let i = 0;
  while (i < buf.length) {
    const sp = buf.indexOf(0x20, i);
    if (sp === -1) break;
    const len = parseInt(buf.toString('utf8', i, sp), 10);
    if (!len) break;
    const record = buf.toString('utf8', sp + 1, i + len - 1);
    if (record.startsWith('path=')) return record.slice('path='.length);
    i += len;
  }
  return null;
}

export function parseTar(buf) {
  const files = [];
  let offset = 0;
  let nextPath = null;
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    let empty = true;
    for (let i = 0; i < 512; i++) { if (header[i] !== 0) { empty = false; break; } }
    if (empty) break; // end-of-archive marker

    const name = readStr(header, 0, 100);
    const size = parseInt(readStr(header, 124, 12).trim(), 8) || 0;
    const typeflag = String.fromCharCode(header[156]);
    const prefix = readStr(header, 345, 155);
    const full = prefix ? `${prefix}/${name}` : name;

    const dataStart = offset + 512;
    const data = buf.subarray(dataStart, dataStart + size);
    if (typeflag === 'x') {
      nextPath = paxPath(data);
    } else {
      // typeflag '0' or NUL = regular file; everything else (dirs '5', global
      // pax 'g', gnu long-name 'L'/'K', symlinks, ...) is skipped.
      if (typeflag === '0' || typeflag === '\0') {
        files.push({ name: nextPath ?? full, data });
      }
      nextPath = null;
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

/** Where a repo-relative path lands locally, or null when it is not synced. */
export function targetFor(rel) {
  if (!rel.endsWith('.json') || rel.split('/').includes('..')) return null;
  if (rel.startsWith(`${MIRROR_SUBDIR}/`)) {
    return path.join(MIRROR_DEST, rel.slice(MIRROR_SUBDIR.length + 1));
  }
  if (rel.startsWith(`${SUBDIR}/`)) {
    const belowSubdir = rel.slice(SUBDIR.length + 1); // e.g. "nbg51.json"
    if (!ALL && !FILES.includes(path.basename(belowSubdir))) return null;
    return path.join(DEST, belowSubdir);
  }
  return null;
}

async function fetchTarball() {
  const apiUrl = `https://api.github.com/repos/${REPO}/tarball/${BRANCH}`;
  // redirect:'follow' - undici (Node fetch) drops the Authorization header on a
  // cross-origin redirect (api.github.com -> codeload.github.com) per the Fetch
  // spec, so the CDN never sees our token (which would otherwise 400). That is
  // exactly the behaviour we want; do NOT re-add auth to the redirected request.
  const res = await fetch(apiUrl, {
    redirect: 'follow',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub tarball API ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export function writeEntries(entries, root = process.cwd()) {
  let data = 0;
  let mirrored = 0;
  for (const e of entries) {
    // strip the leading "<owner>-<repo>-<sha>/" segment GitHub adds
    const rel = e.name.split('/').slice(1).join('/');
    const target = targetFor(rel);
    if (!target) continue;

    const abs = path.join(root, target);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, e.data);
    if (rel.startsWith(`${MIRROR_SUBDIR}/`)) mirrored++;
    else { data++; log(`wrote ${target} (${e.data.length} bytes)`); }
  }
  return { data, mirrored };
}

async function main() {
  if (!TOKEN) {
    // A production build without the token would go live without NBG51, NET,
    // Schlachter and KingComments. Failing keeps the previous deployment up.
    if (process.env.VERCEL_ENV === 'production') {
      throw new Error('GITHUB_TOKEN is not set for this production build.');
    }
    log('GITHUB_TOKEN not set - skipping sync (using whatever is already in ./private).');
    log('Without it NBG51, NET, Schlachter and KingComments are missing locally.');
    return; // don't break local/contributor builds
  }

  log(`repo=${REPO} branch=${BRANCH} subdir=${SUBDIR} dest=${DEST} files=${ALL ? '*' : FILES.join(',')} mirror=${MIRROR_SUBDIR}/ -> ${MIRROR_DEST}/`);

  const gz = await fetchTarball();
  const tar = zlib.gunzipSync(gz);
  const { data, mirrored } = writeEntries(parseTar(tar));

  if (data === 0) {
    throw new Error(`No matching files written. Check GITHUB_DATA_SUBDIR/FILES against the repo contents.`);
  }
  if (mirrored === 0) {
    throw new Error(`Nothing found under ${MIRROR_SUBDIR}/ in ${REPO}@${BRANCH}.`);
  }
  log(`done - ${data} data file(s) and ${mirrored} ${MIRROR_SUBDIR}/ file(s) synced.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(`[sync-data] FAILED: ${err.message}`);
    process.exit(1); // token was present but sync failed -> fail the build
  });
}
