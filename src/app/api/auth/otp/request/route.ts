import { NextRequest, NextResponse } from "next/server";
import { canSignIn, normalizeEmail } from "@/lib/authStore";
import { getCurrentAccount } from "@/lib/currentUser";
import { issueCode, RateLimitError } from "@/lib/otp";
import { codeEmail, sendEmail } from "@/lib/mailer";

/** Sends a one-time code. `purpose: "stepup"` re-confirms the signed-in user (the code goes
 * to their own email; any email in the body is ignored). For sign-in, the response is the
 * same whether or not the email has access, so this can't be used to discover who's a user. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; purpose?: string };
  const purpose = body.purpose === "stepup" ? "stepup" : "signin";

  let email: string | null;
  if (purpose === "stepup") {
    email = (await getCurrentAccount())?.email ?? null;
    if (!email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  } else {
    email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
    if (!(await canSignIn(email))) return NextResponse.json({ ok: true });
  }

  try {
    const code = await issueCode(email);
    const { subject, text, html } = codeEmail(code, purpose);
    await sendEmail(email, subject, text, html);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof RateLimitError ? 429 : 500;
    return NextResponse.json({ error: err.message ?? "Couldn't send the code." }, { status });
  }
}
