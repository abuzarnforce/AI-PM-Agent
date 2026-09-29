import { NextRequest, NextResponse } from "next/server";
import { createFollowUp, deleteFollowUp, listFollowUps, updateFollowUp } from "@/lib/standup";

export async function GET() {
  return NextResponse.json({ followups: await listFollowUps() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const followup = await createFollowUp({
    title: body.title.trim(),
    description: body.description ?? "",
    ownerId: body.ownerId ?? null,
    createdBy: body.createdBy ?? "PM",
    dueDate: body.dueDate ?? null,
    priority: body.priority ?? "Medium",
    relatedJiraIssue: body.relatedJiraIssue ?? null,
    tags: body.tags ?? [],
    source: body.source ?? "manual",
  });
  return NextResponse.json({ followup });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { id, ...patch } = body;
  const followup = await updateFollowUp(id, patch);
  return NextResponse.json({ followup });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteFollowUp(id);
  return NextResponse.json({ ok: true });
}
