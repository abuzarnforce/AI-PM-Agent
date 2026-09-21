import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

const DATA_DIR = path.join(process.cwd(), ".data");

let redisClient: Redis | null | undefined;

/** On Vercel, a connected Redis integration (Marketplace "KV"/Upstash Redis) injects
 * KV_REST_API_URL / KV_REST_API_TOKEN automatically. When those aren't present (local
 * dev, or no database connected yet), fall back to the same .data/*.json files this
 * app always used — so `next dev` needs zero extra setup. */
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

/** Redis keys are flat strings and happily contain "/" or ":" (e.g. "owner/repo"),
 * but the local file-fallback path is built from the same key — sanitize it so a
 * key like "repoActivitySnapshot:NForce-One/NForce-OneHR" can't be misread as a
 * subdirectory that doesn't exist. */
function safeFileName(key: string): string {
  return key.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function readJson<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) return (await redis.get<T>(key)) ?? null;

  const file = path.join(DATA_DIR, `${safeFileName(key)}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value);
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${safeFileName(key)}.json`), JSON.stringify(value, null, 2), "utf-8");
}
