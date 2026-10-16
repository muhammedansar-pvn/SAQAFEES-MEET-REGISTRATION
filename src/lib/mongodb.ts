import mongoose from "mongoose";

function getMongoUri(): string {
  const raw = process.env.MONGODB_URI || "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (!cleaned) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[MongoDB] Warning: MONGODB_URI is not set in production. Ensure MONGODB_URI is configured in your deployment environment variables."
      );
    }
    return "mongodb://127.0.0.1:27017/saqafees-meet";
  }
  return cleaned;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // If connection is already open (readyState === 1), reuse it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If in disconnected state, reset promise to re-establish connection
  if (mongoose.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const uri = getMongoUri();
    const opts: mongoose.ConnectOptions = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        console.error("[MongoDB Connection Error]", err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}
