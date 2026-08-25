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

const connectMongoDB = async (): Promise<typeof mongoose | null> => {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

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
    return cache.conn;
  } catch (error) {
    // Drop the rejected promise so the next request retries rather than
    // awaiting a failure forever.
    cache.promise = null;
    console.error('MongoDB connection error:', error);
    return null;
  }
};

export default connectMongoDB;
