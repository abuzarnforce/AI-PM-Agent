import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/currentUser";
import { inviteAccount, listAccounts, normalizeEmail, removeAccount, updateAccount, type Role } from "@/lib/authStore";
import { inviteEmail, sendEmail } from "@/lib/mailer";

const isRole = (r: unknown): r is Role => r === "admin" || r === "member";

async function requireAdmin() {
  const me = await getCurrentAccount();
  if (!me) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (me.role !== "admin") return { error: NextResponse.json({ error: "Only workspace admins can manage people." }, { status: 403 }) };
  return { me };
}

export async function GET() {
  const me = await getCurrentAccount();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const accounts = (await listAccounts()).map(({ email, name, role, status, lastLoginAt }) => ({ email, name, role, status, lastLoginAt }));
  return NextResponse.json({ accounts });
}

/** Invite a teammate by email. Their first sign-in code activates the account. */
export async function POST(req: NextRequest) {
  const { me, error } = await requireAdmin();
  if (!me) return error;
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string };
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  try {
    const account = await inviteAccount(email, isRole(body.role) ? body.role : "member", me.email);
    const { subject, text, html } = inviteEmail(me.name || me.email, `${req.nextUrl.origin}/login?email=${encodeURIComponent(email)}`);
    // The invite stands even if the email bounces; they can still sign in from /login.
    const emailed = await sendEmail(email, subject, text, html).then(() => true, () => false);
    return NextResponse.json({ account, emailed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not invite." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { me, error } = await requireAdmin();
  if (!me) return error;
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string };
  const email = normalizeEmail(body.email);
  if (!email || !isRole(body.role)) return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  try {
    return NextResponse.json({ account: await updateAccount(email, { role: body.role }) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { me, error } = await requireAdmin();
  if (!me) return error;
  const email = normalizeEmail(((await req.json().catch(() => ({}))) as { email?: string }).email);
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (email === me.email) return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  try {
    await removeAccount(email);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
