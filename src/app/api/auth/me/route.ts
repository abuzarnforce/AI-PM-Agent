import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/currentUser";
import { updateAccount, type Account } from "@/lib/authStore";

const view = (a: Account) => ({
  username: a.name || a.email.split("@")[0],
  name: a.name,
  email: a.email,
  role: a.role,
});

export async function GET() {
  const me = await getCurrentAccount();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(view(me));
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentAccount();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean || clean.length > 60) return NextResponse.json({ error: "Name must be 1–60 characters." }, { status: 400 });
  return NextResponse.json(view(await updateAccount(me.email, { name: clean })));
}
