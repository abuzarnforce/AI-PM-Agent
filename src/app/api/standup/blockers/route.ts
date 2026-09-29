import { NextRequest, NextResponse } from "next/server";
import { createBlocker, deleteBlocker, listBlockers, updateBlocker } from "@/lib/standup";

export async function GET() {
  return NextResponse.json({ blockers: await listBlockers() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const blocker = await createBlocker({
    title: body.title.trim(),
    description: body.description ?? "",
    ownerId: body.ownerId ?? null,
    severity: body.severity ?? "Medium",
    relatedJiraIssue: body.relatedJiraIssue ?? null,
    notes: body.notes ?? "",
  });
  return NextResponse.json({ blocker });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { id, ...patch } = body;
  const blocker = await updateBlocker(id, patch);
  return NextResponse.json({ blocker });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteBlocker(id);
  return NextResponse.json({ ok: true });
}
