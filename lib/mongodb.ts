import mongoose from 'mongoose';

/**
 * One connection per serverless container, shared by every request it handles.
 *
 * The previous version only checked `readyState === 0`. While a connection was
 * still opening (`readyState === 2`) it returned immediately, so the queries
 * that followed went into mongoose's buffer and waited there - which is how a
 * page that does nothing but read six indexed documents ended up with a 1.8s
 * TTFB. Concurrent requests in a cold container could also each start their own
 * connect. Caching the promise fixes both: the first caller opens the socket,
 * everyone else awaits the same promise.
 *
 * The cache hangs off `globalThis` because module state is not guaranteed to
 * survive between invocations in dev, where the module graph is reloaded.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalWithMongoose._mongooseCache ?? { conn: null, promise: null };
globalWithMongoose._mongooseCache = cache;

/** mongoose `connection.readyState` values, named. */
const CONNECTED = 1;
const CONNECTING = 2;

/**
 * How long a query may sit in mongoose's buffer waiting for a live socket.
 *
 * The default is 10s, which is where "Operation `studyenrollments.findOne()`
 * buffering timed out after 10000ms" came from. Buffering is worth keeping - it
 * rides out the sub-second blips the driver reconnects through on its own - but
 * ten seconds of it means a page hangs for ten seconds and THEN fails, and the
 * server-selection timeout below has already given up at eight. Five seconds is
 * long enough to cover a reconnect and short enough that a real outage fails
 * while the reader is still looking at the page.
 */
const BUFFER_TIMEOUT_MS = 5000;

// Set globally rather than per-connection: mongoose types `bufferTimeoutMS` as a
// global/schema option, not a `ConnectOptions` field.
mongoose.set('bufferTimeoutMS', BUFFER_TIMEOUT_MS);

const connectMongoDB = async (): Promise<typeof mongoose | null> => {
  const state = mongoose.connection.readyState;

  if (cache.conn && state === CONNECTED) return cache.conn;

  /**
   * A settled promise is NOT proof of a live socket.
   *
   * This is the bug behind the intermittent "buffering timed out" 500s. Once the
   * first connect resolved, `cache.promise` stayed set forever. If the socket
   * later dropped - an Atlas failover, a laptop waking from sleep, a container
   * idling long enough for the pool to be reaped - `readyState` went to 0 while
   * that promise was still there and still resolved. The next request skipped
   * the reconnect branch, awaited the stale promise, got it back instantly, and
   * handed the caller a mongoose that could not talk to the server. The query
   * after it went into the buffer and surfaced ten seconds later as a
   * server-side exception on whatever page the reader happened to be opening.
   *
   * So: when the connection is neither up nor on its way up, throw the cache
   * away and dial again.
   */
  if (cache.promise && state !== CONNECTED && state !== CONNECTING) {
    cache.promise = null;
    cache.conn = null;
  }

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MongoDB connection error: MONGODB_URI is not set');
      return null;
    }

    cache.promise = mongoose.connect(uri, {
      // Fail fast instead of letting a request hang on a dead pool: a 500 the
      // client can retry beats a socket that never answers.
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Drop the rejected promise so the next request retries rather than
    // awaiting a failure forever.
    cache.promise = null;
    cache.conn = null;
    console.error('MongoDB connection error:', error);
    return null;
  }

  /**
   * One retry, immediately.
   *
   * `mongoose.connect` can resolve against a connection that drops between the
   * handshake and the first query - exactly the window that produced the
   * timeouts above. Re-reading `readyState` after the await catches that, and a
   * single fresh dial covers the common case (a failover that has already
   * elected a new primary) without turning a real outage into a retry storm.
   */
  if (mongoose.connection.readyState !== CONNECTED) {
    cache.promise = null;
    cache.conn = null;

    const uri = process.env.MONGODB_URI;
    if (!uri) return null;

    try {
      cache.promise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      });
      cache.conn = await cache.promise;
    } catch (error) {
      cache.promise = null;
      cache.conn = null;
      console.error('MongoDB reconnect failed:', error);
      return null;
    }
  }

  return cache.conn;
};

/**
 * `connectMongoDB`, but a failure is an error rather than a `null` nobody reads.
 *
 * Every caller of `connectMongoDB` ignored its return value and went straight to
 * a query, so a failed connect became a ten-second buffer timeout deep inside
 * mongoose - reported to the reader as "Application error: a server-side
 * exception has occurred" with nothing but a digest. Route handlers and pages
 * that use this get a clean, immediate failure they can turn into a 503 or an
 * error boundary instead.
 */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super('De database is nu niet bereikbaar.');
    this.name = 'DatabaseUnavailableError';
  }
}

export async function requireDatabase(): Promise<typeof mongoose> {
  const conn = await connectMongoDB();
  if (!conn) throw new DatabaseUnavailableError();
  return conn;
}

export default connectMongoDB;
