import { NextRequest, NextResponse } from "next/server";
import { getCurrentUsername } from "@/lib/currentUser";
import { listUsernames, createUser } from "@/lib/authStore";

export async function GET() {
  const me = getCurrentUsername();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ usernames: listUsernames() });
}

export async function POST(req: NextRequest) {
  const me = getCurrentUsername();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    createUser(username.trim(), password);
    return NextResponse.json({ username: username.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not create user." }, { status: 400 });
  }
}
