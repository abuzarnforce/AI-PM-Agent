import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/authStore";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  if (!(await verifyPassword(username.trim(), password))) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ username: username.trim() });
  res.cookies.set(SESSION_COOKIE, createSessionToken(username.trim()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
