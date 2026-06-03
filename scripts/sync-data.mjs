// scripts/sync-data.mjs
//
// Pulls licensed/restricted Bible JSON (e.g. NBG-vertaling 1951) from a PRIVATE
// GitHub repo at build time and writes it into ./private so it is baked into the
// Vercel deployment WITHOUT ever being committed to this repo or served as a
// public static asset.
//
// One request only: the GitHub tarball API. We never fetch per-file (rate limits).
//
// Vercel pattern chosen: BUILD-TIME sync (package.json "prebuild").
//   - Vercel's runtime filesystem is read-only (only /tmp, wiped on cold start),
//     so we materialise the data during the build and read it with fs at runtime.
//   - Data is tiny (nbg51.json ~8 MB), well under the ~250 MB function bundle cap,
//     so baking it in is simpler and faster than the cold-start /tmp alternative.
//   - next.config.ts `outputFileTracingIncludes` forces ./private into the
//     bible API serverless bundle (dynamic fs reads aren't auto-traced).
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

const REPO   = process.env.GITHUB_DATA_REPO   || 'AlexLamper/bijbelapi-data';
const BRANCH = process.env.GITHUB_DATA_BRANCH || 'main';
const SUBDIR = (process.env.GITHUB_DATA_SUBDIR || 'data').replace(/\/+$/, '');
const DEST   = process.env.GITHUB_DATA_DEST   || 'private/data/bibles';
const TOKEN  = process.env.GITHUB_TOKEN;
const FILES  = (process.env.GITHUB_DATA_FILES ?? 'nbg51.json')
  .split(',').map(s => s.trim()).filter(Boolean);
const ALL    = FILES.length === 0 || FILES.includes('*');

const UA = 'bijbelstudie-sync-data';

function log(msg) { console.log(`[sync-data] ${msg}`); }

// Minimal POSIX/ustar tar reader. GitHub tarball paths are short (< 100 chars)
// so the standard name field suffices; pax/global headers are skipped.
function readStr(buf, start, len) {
  let end = start;
  const max = Math.min(start + len, buf.length);
  while (end < max && buf[end] !== 0) end++;
  return buf.toString('utf8', start, end);
}

function parseTar(buf) {
  const files = [];
  let offset = 0;
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
    // typeflag '0' or NUL = regular file; everything else (dirs '5', pax 'x'/'g',
    // gnu long-name 'L'/'K', symlinks, ...) is skipped.
    if (typeflag === '0' || typeflag === '\0') {
      files.push({ name: full, data: buf.subarray(dataStart, dataStart + size) });
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

async function fetchTarball() {
  const apiUrl = `https://api.github.com/repos/${REPO}/tarball/${BRANCH}`;
  // redirect:'follow' — undici (Node fetch) drops the Authorization header on a
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

async function main() {
  if (!TOKEN) {
    log('GITHUB_TOKEN not set — skipping sync (using whatever is already on disk).');
    log('On Vercel this token MUST be set or restricted translations will be missing.');
    return; // don't break local/contributor builds
  }

  log(`repo=${REPO} branch=${BRANCH} subdir=${SUBDIR} dest=${DEST} files=${ALL ? '*' : FILES.join(',')}`);

  const gz = await fetchTarball();
  const tar = zlib.gunzipSync(gz);
  const entries = parseTar(tar);

  const prefix = `${SUBDIR}/`;
  let written = 0;
  for (const e of entries) {
    // strip the leading "<owner>-<repo>-<sha>/" segment GitHub adds
    const rel = e.name.split('/').slice(1).join('/');
    if (!rel.startsWith(prefix) || !rel.endsWith('.json')) continue;
    const belowSubdir = rel.slice(prefix.length); // e.g. "nbg51.json"
    if (!ALL && !FILES.includes(path.basename(belowSubdir))) continue;

    const target = path.join(process.cwd(), DEST, belowSubdir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, e.data);
    log(`wrote ${path.join(DEST, belowSubdir)} (${e.data.length} bytes)`);
    written++;
  }

  if (written === 0) {
    throw new Error(`No matching files written. Check GITHUB_DATA_SUBDIR/FILES against the repo contents.`);
  }
  log(`done — ${written} file(s) synced.`);
}

main().catch(err => {
  console.error(`[sync-data] FAILED: ${err.message}`);
  process.exit(1); // token was present but sync failed -> fail the build
});
