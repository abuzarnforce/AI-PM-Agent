import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const SECRET_PATH = path.join(DATA_DIR, "session-secret.txt");

export const SESSION_COOKIE = "aipm_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Generated once on first run and persisted locally (gitignored, never
 * committed) so sessions survive a dev-server restart but a fresh checkout
 * of this repo never shares a secret with anyone else's. */
function getSecret(): string {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SECRET_PATH)) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(SECRET_PATH, secret);
    return secret;
  }
  return fs.readFileSync(SECRET_PATH, "utf8").trim();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(username: string): string {
  const payload = JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_MS });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined | null): { username: string } | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.u !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return { username: payload.u };
  } catch {
    return null;
  }
}
