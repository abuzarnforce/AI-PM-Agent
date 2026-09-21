import { NextRequest, NextResponse } from "next/server";
import { getCurrentUsername } from "@/lib/currentUser";
import { verifyPassword } from "@/lib/authStore";

/** Used to re-gate sensitive screens (the Connector tab) even within an already
 * signed-in session — checks the CURRENT session user's password, never a
 * client-supplied username, so a re-auth prompt can't be used to probe other accounts. */
export async function POST(req: NextRequest) {
  const username = getCurrentUsername();
  if (!username) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

  const ok = verifyPassword(username, password);
  if (!ok) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
