import crypto from "node:crypto";

/** "Continue with Google / Microsoft" via OpenID Connect, no SDK. Authorization-code flow with
 * PKCE + state + nonce. The ID token comes straight from the provider's token endpoint over TLS,
 * which OIDC Core §3.1.3.7 accepts in place of a signature check; claims are still validated.
 * A provider shows up on the sign-in page only when its env vars are set. */

export type ProviderId = "google" | "microsoft";

interface Provider {
  label: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  issuer: string;
}

export function getProvider(id: string): Provider | null {
  if (id === "google" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      label: "Google",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      issuer: "https://accounts.google.com",
    };
  }
  // Single-tenant on purpose: only your organisation's Entra ID directory can sign in. A
  // multi-tenant app would trust the `email` claim from any directory, and Microsoft doesn't
  // verify that claim (the "nOAuth" account-takeover pattern).
  const tenant = process.env.MICROSOFT_TENANT_ID;
  if (id === "microsoft" && tenant && process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    return {
      label: "Microsoft",
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    };
  }
  return null;
}

export const enabledProviders = (): ProviderId[] => (["google", "microsoft"] as const).filter((p) => getProvider(p));

const rand = () => crypto.randomBytes(32).toString("base64url");

export function startAuth(p: Provider, redirectUri: string) {
  const state = rand();
  const nonce = rand();
  const verifier = rand();
  const url = new URL(p.authUrl);
  url.search = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, nonce, verifier };
}

export async function exchangeCode(p: Provider, code: string, verifier: string, redirectUri: string): Promise<Record<string, unknown>> {
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: p.clientId,
      client_secret: p.clientSecret,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.id_token !== "string") throw new Error(`token exchange failed (${res.status})`);
  const [, body] = data.id_token.split(".");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}

/** Returns the verified identity, or null if any check fails. */
export function checkClaims(
  id: ProviderId,
  p: Pick<Provider, "clientId" | "issuer">,
  c: Record<string, any>,
  nonce: string
): { email: string; subject: string; name: string } | null {
  const issuers = id === "google" ? [p.issuer, "accounts.google.com"] : [p.issuer];
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!issuers.includes(c.iss) || !aud.includes(p.clientId) || c.nonce !== nonce) return null;
  if (typeof c.exp !== "number" || c.exp * 1000 < Date.now() || typeof c.sub !== "string" || !c.sub) return null;

  let email: unknown;
  if (id === "google") {
    if (c.email_verified !== true) return null;
    email = c.email;
  } else {
    // Inside your own tenant, the admin controls these values. Prefer `email`, fall back to the sign-in name.
    email = typeof c.email === "string" && c.email.includes("@") ? c.email : c.preferred_username;
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { email: email.trim().toLowerCase(), subject: `${id}:${c.sub}`, name: typeof c.name === "string" ? c.name.slice(0, 60) : "" };
}
