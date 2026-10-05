import { NextRequest, NextResponse } from "next/server";
import { connectToJira, disconnectJira, searchJiraForConnect } from "@/lib/roadmap";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ issues: await searchJiraForConnect(q) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Something went wrong" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const { id, jiraKey, disconnect } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  try {
    const item = disconnect ? await disconnectJira(id) : await connectToJira(id, jiraKey);
    return NextResponse.json({ item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Something went wrong" }, { status: 400 });
  }
}
