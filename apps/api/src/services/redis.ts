/**
 * Shared Redis client for the assets proxy cache.
 *
 * Lazy singleton: connects on first use. If `REDIS_URL` is unset (e.g.
 * local dev without redis), returns `null` and callers fall through to
 * the no-cache code path. Reuses the same `REDIS_URL` env var the
 * websocket adapter already reads.
 */

import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (client) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient({ url }) as unknown as RedisClientType;
    c.on("error", (err) => {
      console.warn("[redis] client error:", err.message);
    });
    await c.connect();
    client = c;
    return c;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/**
 * Tiny get/set JSON wrapper. Returns parsed value or `null` on miss/error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const c = await getRedisClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn(`[redis] get failed for ${key}:`, (err as Error).message);
    return null;
  }
}

/**
 * Set with TTL (seconds). Swallows errors — caching is best-effort.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const c = await getRedisClient();
  if (!c) return;
  try {
    await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.warn(`[redis] set failed for ${key}:`, (err as Error).message);
  }
}
