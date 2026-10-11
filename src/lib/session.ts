import crypto from "crypto";

export const SESSION_COOKIE = "aipm_session";
/** Short-lived proof that the user just re-confirmed with an emailed code. Gates the
 * Connections screen, which holds Jira/AI/GitHub credentials. */
export const ELEVATED_COOKIE = "aipm_elevated";

export const OAUTH_COOKIE = "aipm_oauth";
export const LINK_COOKIE = "aipm_sso_link";

export const SESSION_TTL_S = 7 * 24 * 60 * 60;
export const ELEVATED_TTL_S = 15 * 60;

/** session: signed-in user · elevated: fresh step-up code · oauth: SSO round-trip state ·
 * link: an SSO identity waiting for its first-time email code before it's trusted. */
type Purpose = "session" | "elevated" | "oauth" | "link";

/** Set on Vercel as an env var. Locally, next.config.mjs generates one into the gitignored
 * .data/ folder and exports it, so Edge middleware and Node routes sign with the same key. */
export function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createToken(email: string, purpose: Purpose, ttlSeconds: number, extra?: Record<string, string>): string {
  const payload = JSON.stringify({ sub: email, p: purpose, exp: Date.now() + ttlSeconds * 1000, x: extra });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyToken(
  token: string | undefined | null,
  purpose: Purpose
): { email: string; extra: Record<string, string> } | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(sign(encoded), "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.sub !== "string" || payload.p !== purpose || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return { email: payload.sub, extra: payload.x ?? {} };
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
