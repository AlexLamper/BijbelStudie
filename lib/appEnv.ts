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
  /** True when a non-production deployment is pointed at the live database. */
  unsafe: boolean;
  message: string | null;
};

export function checkDatabaseSafety(): DatabaseSafety {
  const env = appEnv();
  const database = currentDatabaseName();
  const unsafe = env === 'preview' && database === PRODUCTION_DATABASE;

  return {
    env,
    database,
    unsafe,
    message: unsafe
      ? `Preview deployment is pointed at the production database (${PRODUCTION_DATABASE}). ` +
        'Set a preview-scoped MONGODB_URI in Vercel -> Settings -> Environment Variables ' +
        '(Preview only), ending in a different database name.'
      : null,
  };
}

/**
 * Refuses to let a preview deployment touch the live database.
 *
 * Deliberately a throw and not a warning. A warning in a serverless log is a
 * warning nobody reads, and the cost of getting this wrong is writes landing on
 * real accounts during a test. Production is never blocked by this, and a local
 * dev machine is left alone - pointing `next dev` at whatever you like is a
 * choice you make knowingly, at a keyboard.
 */
export function assertSafeDatabase(): void {
  const safety = checkDatabaseSafety();
  if (safety.unsafe) throw new Error(`[appEnv] ${safety.message}`);
}
