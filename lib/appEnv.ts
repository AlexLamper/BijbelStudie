/**
 * Which deployment this is, and the one guard that keeps a test deployment off
 * the live database.
 *
 * The whole point of a preview environment is that you can exercise a change
 * against a real deployment before it reaches anyone. That only works if the
 * preview writes somewhere else. A URI whose path names a different database
 * connects perfectly happily and silently reads and writes the wrong data -
 * .env.example already warns about it - and on a preview that failure mode is
 * worse than a crash, because you would be testing destructively against real
 * accounts and never know.
 *
 * So this module makes the environment legible (banner, /api/health) and makes
 * the dangerous combination loud (assertSafeDatabase).
 */

export type AppEnv = 'production' | 'preview' | 'development';

/**
 * The database the live site uses. Named here rather than inferred so the guard
 * below has something concrete to refuse; keep it in step with the production
 * `MONGODB_URI`.
 */
export const PRODUCTION_DATABASE = 'scriptura';

/**
 * `VERCEL_ENV` is set by Vercel to production / preview / development.
 * Anything else (a local `next dev`, a CI box) is development.
 */
export function appEnv(): AppEnv {
  const vercel = process.env.VERCEL_ENV;
  if (vercel === 'production') return 'production';
  if (vercel === 'preview') return 'preview';
  return 'development';
}

export function isProduction(): boolean {
  return appEnv() === 'production';
}

/** True on anything a tester may safely break. */
export function isTestEnvironment(): boolean {
  return appEnv() !== 'production';
}

/**
 * The database name from a Mongo URI - the part after the host and before the
 * query string. Returns null when the URI names no database at all, which is
 * itself worth knowing: the driver then falls back to `test`.
 */
export function databaseNameFrom(uri: string | undefined | null): string | null {
  if (!uri) return null;
  try {
    // `mongodb+srv://user:pass@host/dbname?opts` - strip scheme, credentials,
    // host, then options. Done by hand because `new URL()` rejects mongodb+srv
    // in some runtimes.
    const afterScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
    const afterHost = afterScheme.slice(afterScheme.indexOf('/') + 1);
    if (!afterHost || afterScheme.indexOf('/') === -1) return null;
    const name = afterHost.split('?')[0].trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/** The database this deployment will actually talk to. */
export function currentDatabaseName(): string | null {
  return databaseNameFrom(process.env.MONGODB_URI);
}

export type DatabaseSafety = {
  env: AppEnv;
  database: string | null;
  /** True when a preview deployment is reading and writing the live database. */
  onProductionData: boolean;
  /** True only when that is ALSO configured to be refused. See below. */
  unsafe: boolean;
  message: string | null;
};

/**
 * Blocking is opt-IN, and off by default.
 *
 * This project deliberately runs previews against the same database as
 * production: there is one small cluster, one developer, and testing with your
 * own real account is how the app actually gets exercised. Refusing to serve in
 * that situation would break every preview branch to prevent a problem this
 * setup does not have.
 *
 * So the default is to *say* what is going on - the red LIVE DATA badge and
 * /api/health - and let the person reading it decide. Set
 * `BLOCK_PRODUCTION_DB_ON_PREVIEW=true` on the Preview scope if a separate
 * staging database is ever set up and you want the boundary enforced.
 */
function blockingArmed(): boolean {
  return process.env.BLOCK_PRODUCTION_DB_ON_PREVIEW === 'true';
}

export function checkDatabaseSafety(): DatabaseSafety {
  const env = appEnv();
  const database = currentDatabaseName();
  const onProductionData = env === 'preview' && database === PRODUCTION_DATABASE;

  return {
    env,
    database,
    onProductionData,
    // "unsafe" means "refuse to run", which needs the block to be armed.
    unsafe: onProductionData && blockingArmed(),
    message: onProductionData
      ? 'This preview deployment shares the production database ' +
        `(${PRODUCTION_DATABASE}). Anything you do here writes to real data. ` +
        (blockingArmed()
          ? 'Blocked, because BLOCK_PRODUCTION_DB_ON_PREVIEW=true.'
          : 'That is the configured behaviour for this project.')
      : null,
  };
}

/**
 * Stops a preview deployment touching the live database - but only when asked.
 *
 * Off by default (see [blockingArmed]). What it will never do, whatever the
 * setting:
 * - fire in production. `VERCEL_ENV` is `production` there, and the condition
 *   requires `preview`;
 * - fire on a local machine. `VERCEL_ENV` is unset, so `appEnv()` is
 *   `development`.
 *
 * Both are covered by tests/appEnv.test.ts, because they are the whole "can
 * this take the live site down?" question and the answer has to stay no.
 */
export function assertSafeDatabase(): void {
  const safety = checkDatabaseSafety();
  if (safety.unsafe) throw new Error(`[appEnv] ${safety.message}`);
}
