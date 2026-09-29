import { NextRequest, NextResponse } from "next/server";
import { addTeamMember, listTeam, removeTeamMember } from "@/lib/standup";

export async function GET() {
  return NextResponse.json({ team: await listTeam() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const member = await addTeamMember({ name: body.name.trim(), role: body.role?.trim() || undefined, jiraDisplayName: body.jiraDisplayName?.trim() || undefined });
  return NextResponse.json({ member });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await removeTeamMember(id);
  return NextResponse.json({ ok: true });
}
