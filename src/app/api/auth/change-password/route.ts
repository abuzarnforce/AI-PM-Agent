import { NextRequest, NextResponse } from "next/server";
import { getCurrentUsername } from "@/lib/currentUser";
import { verifyPassword, changePassword } from "@/lib/authStore";

export async function POST(req: NextRequest) {
  const me = getCurrentUsername();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (!(await verifyPassword(me, currentPassword))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  await changePassword(me, newPassword);
  return NextResponse.json({ ok: true });
}
