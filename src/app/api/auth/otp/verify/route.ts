import { NextRequest, NextResponse } from "next/server";
import { completeSignIn, normalizeEmail, workspaceOf } from "@/lib/authStore";
import { getCurrentAccount } from "@/lib/currentUser";
import { checkCode } from "@/lib/otp";
import { cookieOptions, createToken, ELEVATED_COOKIE, ELEVATED_TTL_S, LINK_COOKIE, SESSION_COOKIE, SESSION_TTL_S, verifyToken } from "@/lib/session";

const WRONG = "That code is incorrect or has expired.";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string; purpose?: string };
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (code.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  if (body.purpose === "stepup") {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    if (!(await checkCode(account.email, code))) return NextResponse.json({ error: WRONG }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ELEVATED_COOKIE, createToken(account.email, "elevated", ELEVATED_TTL_S), cookieOptions(ELEVATED_TTL_S));
    return res;
  }

  const email = normalizeEmail(body.email);
  if (!email || !(await checkCode(email, code))) {
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }

  // Arrived from Google / Microsoft: this code proves the SSO identity owns the email, so trust it from now on.
  const link = verifyToken(req.cookies.get(LINK_COOKIE)?.value, "link");
  const sso = link?.email === email ? { identity: link.extra.identity, name: link.extra.name ?? "" } : undefined;

  const { account } = await completeSignIn(email, sso);
  // Ask for a name only if neither the user nor their SSO provider has given us one.
  const res = NextResponse.json({ firstTime: !account.name });
  res.cookies.set(LINK_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, createToken(email, "session", SESSION_TTL_S, { ws: workspaceOf(account) }), cookieOptions(SESSION_TTL_S));
  return res;
}
