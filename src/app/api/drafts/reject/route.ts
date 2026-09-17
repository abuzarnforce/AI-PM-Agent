import { NextRequest, NextResponse } from "next/server";
import { rejectDraft } from "@/lib/drafts";

export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  try {
    const draft = rejectDraft(id);
    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
