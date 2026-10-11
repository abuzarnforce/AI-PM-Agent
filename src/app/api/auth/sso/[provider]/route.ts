import { NextRequest, NextResponse } from "next/server";
import { getProvider, startAuth } from "@/lib/sso";
import { cookieOptions, createToken, OAUTH_COOKIE } from "@/lib/session";

/** Step 1: send the browser to Google / Microsoft. The PKCE verifier, state and nonce ride
 * along in a signed, HTTP-only cookie that only our callback can read. */
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = getProvider(params.provider);
  if (!provider) return NextResponse.redirect(new URL("/login?error=sso_unavailable", req.url));

  const next = req.nextUrl.searchParams.get("next") ?? "/app";
  const redirectUri = `${req.nextUrl.origin}/api/auth/sso/${params.provider}/callback`;
  const { url, state, nonce, verifier } = startAuth(provider, redirectUri);

  const res = NextResponse.redirect(url);
  res.cookies.set(
    OAUTH_COOKIE,
    createToken("", "oauth", 600, { provider: params.provider, state, nonce, verifier, next }),
    cookieOptions(600)
  );
  return res;
}
