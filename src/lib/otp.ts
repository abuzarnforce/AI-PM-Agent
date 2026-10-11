import crypto from "crypto";
import { readJson, writeJson } from "./kvStore";
import { getSecret } from "./session";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5; // per code — then it's burned and a new one must be requested
const RESEND_COOLDOWN_MS = 30 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

interface OtpRecord {
  hash: string;
  exp: number;
  attempts: number;
  sentAt: number[];
}

const key = (email: string) => `otp:${email}`;
// Only a keyed hash is stored, so a leaked KV dump can't be replayed into a sign-in.
const hashCode = (email: string, code: string) =>
  crypto.createHmac("sha256", getSecret()).update(`${email}:${code}`).digest("hex");

export class RateLimitError extends Error {}

/** Issues a fresh 6-digit code (replacing any earlier one) and returns it for emailing. */
export async function issueCode(email: string): Promise<string> {
  const now = Date.now();
  const prev = await readJson<OtpRecord>(key(email));
  const sentAt = (prev?.sentAt ?? []).filter((t) => now - t < WINDOW_MS);
  if (sentAt.length && now - sentAt[sentAt.length - 1] < RESEND_COOLDOWN_MS) {
    throw new RateLimitError("Please wait 30 seconds before requesting another code.");
  }
  if (sentAt.length >= MAX_SENDS_PER_WINDOW) {
    throw new RateLimitError("Too many codes requested. Try again in 15 minutes.");
  }
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await writeJson<OtpRecord>(key(email), { hash: hashCode(email, code), exp: now + CODE_TTL_MS, attempts: 0, sentAt: [...sentAt, now] });
  return code;
}

/** Single-use: a correct code is consumed; a wrong one counts toward MAX_ATTEMPTS. */
export async function checkCode(email: string, code: string): Promise<boolean> {
  const rec = await readJson<OtpRecord>(key(email));
  if (!rec?.hash || Date.now() > rec.exp || rec.attempts >= MAX_ATTEMPTS) return false;
  const a = Buffer.from(hashCode(email, code.replace(/\D/g, "")), "hex");
  const b = Buffer.from(rec.hash, "hex");
  if (crypto.timingSafeEqual(a, b)) {
    // Keep the send history so the rate limit can't be reset by signing in.
    await writeJson<OtpRecord>(key(email), { ...rec, hash: "", exp: 0 });
    return true;
  }
  await writeJson<OtpRecord>(key(email), { ...rec, attempts: rec.attempts + 1 });
  return false;
}
