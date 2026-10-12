import { NextRequest, NextResponse } from "next/server";

/** Every /api route and the /app workspace require a signed-in session. Only the sign-in
 * endpoints and the Vercel cron (which checks its own CRON_SECRET) are public.
 * Edge runtime: verifies the same HMAC-SHA256 token as src/lib/session.ts via Web Crypto. */
const PUBLIC_API = ["/api/auth/otp/", "/api/auth/sso/", "/api/auth/logout", "/api/cron/"];

async function validSession(token: string | undefined): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sig = new Uint8Array(signature.match(/../g)!.map((h) => parseInt(h, 16)));
  if (!(await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(encoded)))) return false;
  try {
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    // Sessions from before workspaces existed carry no `ws`; they must sign in again.
    return payload.p === "session" && typeof payload.x?.ws === "string" && typeof payload.exp === "number" && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // CSRF backstop on top of SameSite=Lax cookies: state-changing calls must come from this site.
  if (isApi && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  if (isApi && PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (await validSession(req.cookies.get("aipm_session")?.value)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/api/:path*", "/app/:path*", "/app"] };
