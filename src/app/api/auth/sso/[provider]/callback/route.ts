import { NextRequest, NextResponse } from "next/server";
import { completeSignIn, hasIdentity, workspaceOf } from "@/lib/authStore";
import { checkClaims, exchangeCode, getProvider, type ProviderId } from "@/lib/sso";
import { issueCode, RateLimitError } from "@/lib/otp";
import { codeEmail, sendEmail } from "@/lib/mailer";
import { cookieOptions, createToken, LINK_COOKIE, OAUTH_COOKIE, SESSION_COOKIE, SESSION_TTL_S, verifyToken } from "@/lib/session";

const safeNext = (n: string | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/app");

/** Step 2: Google / Microsoft send the browser back here with a one-time code.
 * A known identity signs straight in. An identity we haven't seen for this email before
 * (first-time user, or first time using this provider) must also enter an emailed code,
 * so an SSO account can never claim a workspace email it doesn't actually receive mail for. */
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const q = req.nextUrl.searchParams;
  const fail = (error: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  const provider = getProvider(params.provider);
  if (!provider) return fail("sso_unavailable");
  if (q.get("error")) return fail("sso_cancelled");

  const st = verifyToken(req.cookies.get(OAUTH_COOKIE)?.value, "oauth")?.extra;
  if (!st || st.provider !== params.provider || !q.get("state") || st.state !== q.get("state") || !q.get("code")) {
    return fail("sso_failed");
  }

  let who: ReturnType<typeof checkClaims>;
  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/sso/${params.provider}/callback`;
    const claims = await exchangeCode(provider, q.get("code")!, st.verifier, redirectUri);
    who = checkClaims(params.provider as ProviderId, provider, claims, st.nonce);
  } catch (err) {
    console.error("[sso]", err);
    return fail("sso_failed");
  }
  if (!who) return fail("sso_failed");

  const next = safeNext(st.next);

  if (await hasIdentity(who.email, who.subject)) {
    const { account } = await completeSignIn(who.email, { identity: who.subject, name: who.name });
    const res = NextResponse.redirect(new URL(next, req.url));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(SESSION_COOKIE, createToken(who.email, "session", SESSION_TTL_S, { ws: workspaceOf(account) }), cookieOptions(SESSION_TTL_S));
    return res;
  }

  try {
    const code = await issueCode(who.email);
    const { subject, text, html } = codeEmail(code, "signin");
    await sendEmail(who.email, subject, text, html);
  } catch (err) {
    return fail(err instanceof RateLimitError ? "rate_limited" : "email_failed");
  }

  const login = new URL("/login", req.url);
  login.search = new URLSearchParams({ step: "code", email: who.email, via: provider.label, next }).toString();
  const res = NextResponse.redirect(login);
  res.cookies.set(OAUTH_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(LINK_COOKIE, createToken(who.email, "link", 600, { identity: who.subject, name: who.name }), cookieOptions(600));
  return res;
}
