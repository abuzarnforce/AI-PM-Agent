import { NextRequest, NextResponse } from "next/server";
import { upsertUpdate, setAttendance } from "@/lib/standup";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date || !body.memberId) return NextResponse.json({ error: "date and memberId are required" }, { status: 400 });
  const update = await upsertUpdate({
    date: body.date,
    memberId: body.memberId,
    yesterday: body.yesterday ?? "",
    today: body.today ?? "",
    blockers: body.blockers ?? "",
    confidence: body.confidence ?? "on_track",
    notes: body.notes ?? "",
    relatedIssueKeys: body.relatedIssueKeys ?? [],
    present: body.present ?? true,
  });
  return NextResponse.json({ update });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.date || !body.memberId || typeof body.present !== "boolean") {
    return NextResponse.json({ error: "date, memberId and present are required" }, { status: 400 });
  }
  const update = await setAttendance(body.date, body.memberId, body.present);
  return NextResponse.json({ update });
}
