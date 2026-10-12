import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
import { SESSION_COOKIE, verifyToken } from "./session";

const DATA_DIR = path.join(process.cwd(), ".data");

/* ---- Workspaces ------------------------------------------------------------
   Every key is scoped to the signed-in user's workspace, so one company's Jira,
   drafts, QA sheets and keys are invisible to everyone else. The main workspace
   (the original deployment's data) keeps its unprefixed keys, so no migration.
   Fails closed: with no provable workspace, reads and writes throw. */

export const MAIN_WORKSPACE = "main";
const isGlobalKey = (key: string) => key === "accounts" || key.startsWith("otp:") || key.startsWith("ratelimit:");
const pinned = new AsyncLocalStorage<string>();

/** For work with no signed-in user, e.g. the Vercel cron refreshing the main workspace. */
export const runInWorkspace = <T>(workspace: string, fn: () => Promise<T>) => pinned.run(workspace, fn);

/** The session's workspace — re-checked against the account on every call, so removing
 * someone (or moving them) cuts off data access immediately, not when their cookie expires. */
export async function currentWorkspace(): Promise<string> {
  const p = pinned.getStore();
  if (p) return p;
  const session = verifyToken(cookies().get(SESSION_COOKIE)?.value, "session");
  const ws = session?.extra.ws;
  if (session && ws) {
    const accounts = (await rawRead<{ email: string; status: string; workspace?: string }[]>("accounts")) ?? [];
    const me = accounts.find((a) => a.email === session.email);
    if (me?.status === "active" && (me.workspace ?? MAIN_WORKSPACE) === ws) return ws;
  }
  throw new Error("Your session has ended. Please sign in again.");
}

async function scoped(key: string): Promise<string> {
  if (isGlobalKey(key)) return key;
  const ws = await currentWorkspace();
  return ws === MAIN_WORKSPACE ? key : `ws:${ws}:${key}`;
}

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

async function rawRead<T>(key: string): Promise<T | null> {
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

async function rawWrite<T>(key: string, value: T): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value);
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${safeFileName(key)}.json`), JSON.stringify(value, null, 2), "utf-8");
}

export async function readJson<T>(key: string): Promise<T | null> {
  return rawRead<T>(await scoped(key));
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  return rawWrite(await scoped(key), value);
}
