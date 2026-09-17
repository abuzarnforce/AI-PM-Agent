import { NextRequest, NextResponse } from "next/server";
import { listDrafts, createDraft } from "@/lib/drafts";

export async function GET() {
  return NextResponse.json({ drafts: listDrafts() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || !body.body || !body.source || !body.kind) {
    return NextResponse.json({ error: "kind, title, body, and source are required" }, { status: 400 });
  }
  const draft = createDraft(body);
  return NextResponse.json({ draft });
}
