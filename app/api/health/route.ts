import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoDB from '../../../lib/mongodb';
import { appEnv, checkDatabaseSafety, PRODUCTION_DATABASE } from '../../../lib/appEnv';
import { XP_VALUES } from '../../../lib/gamification';
import { TRAIT_LEVELS } from '../../../lib/levensboom/traits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * "Which deployment am I looking at, and is it wired to the right database?"
 *
 * The first question you have to be able to answer before testing anything on a
 * preview URL, and the one that is otherwise unanswerable from outside: two
 * deployments of the same commit are indistinguishable in the browser, and the
 * expensive mistake is exercising a change against the live database while
 * believing you are on staging.
 *
 * Deliberately says nothing secret. The database NAME is the whole point of the
 * endpoint; the URI, the host and the credentials are not here and must not be
 * added. `commit` is the public Git SHA the deployment was built from.
 */
export async function GET() {
  const safety = checkDatabaseSafety();

  // A connect attempt rather than a ping: it is the same path every route
  // takes, so a healthy answer here means the routes are healthy too.
  let database: 'up' | 'down' | 'blocked' = 'down';
  try {
    const conn = await connectMongoDB();
    database = conn && mongoose.connection.readyState === 1 ? 'up' : 'down';
  } catch {
    // `blocked` only happens when BLOCK_PRODUCTION_DB_ON_PREVIEW is armed.
    // Reporting it as its own state is the point - "down" would send you
    // looking for an outage that is not there.
    database = safety.unsafe ? 'blocked' : 'down';
  }

  const body = {
    ok: database === 'up' && !safety.unsafe,
    env: appEnv(),
    database: {
      status: database,
      name: safety.database,
      isProductionDatabase: safety.database === PRODUCTION_DATABASE,
      // True on a preview sharing the live database. Not an error by default -
      // it is how this project is set up - but it is the single most important
      // thing to know before testing anything destructive here.
      sharesProductionData: safety.onProductionData,
      note: safety.message,
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    // Enough to tell at a glance whether the deployment carries the Levensboom
    // work, without shipping a second endpoint for it.
    features: {
      levensboom: true,
      noteXp: 'note_written' in XP_VALUES,
      seasonsTraitLevel: TRAIT_LEVELS.seasons,
    },
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
