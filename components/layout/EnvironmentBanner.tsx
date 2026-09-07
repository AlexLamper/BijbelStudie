import { appEnv, currentDatabaseName, PRODUCTION_DATABASE } from '../../lib/appEnv';

/**
 * A small badge on every non-production deployment.
 *
 * Server-rendered and unconditional, because the failure it prevents is a human
 * one: a preview URL and the live site look identical, and the mistakes that
 * follow from confusing them - testing a destructive change on the wrong one,
 * or reporting a bug against a build nobody shipped - are expensive and quiet.
 *
 * This project runs previews against the production database on purpose, so
 * the red LIVE DATA state is the normal one on a preview rather than an alarm.
 * It is there to keep "the notes I just made are real notes" in view while you
 * are testing, which is the whole protection now that nothing is blocked.
 *
 * Renders nothing in production, so it costs the live site one boolean.
 */
export default function EnvironmentBanner() {
  const env = appEnv();
  if (env === 'production') return null;

  const database = currentDatabaseName();
  const onProductionData = database === PRODUCTION_DATABASE;
  const branch = process.env.VERCEL_GIT_COMMIT_REF;

  return (
    <div
      className="fixed bottom-2 left-2 z-[200] rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold text-white shadow-lg"
      style={{ backgroundColor: onProductionData ? '#DC2626' : '#0D9488' }}
      // Decorative for a reader using the site; the text below carries it for
      // anyone who does land on it with a screen reader.
      role="status"
    >
      {onProductionData ? 'LIVE DATA' : env.toUpperCase()}
      {database ? ` · ${database}` : ' · geen db'}
      {branch ? ` · ${branch}` : ''}
    </div>
  );
}
