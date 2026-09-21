import { NextResponse } from "next/server";
import { getCurrentUsername } from "@/lib/currentUser";

export async function GET() {
  const username = getCurrentUsername();
  if (!username) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ username });
}
