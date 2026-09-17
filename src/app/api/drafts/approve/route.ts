import { NextRequest, NextResponse } from "next/server";
import { approveDraft } from "@/lib/drafts";

/** Hard Rule 1: this is the ONLY route that writes to Jira, and it only ever
 * runs when the PM explicitly clicks Approve in the UI for a specific draft ID. */
export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  try {
    const draft = await approveDraft(id);
    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
