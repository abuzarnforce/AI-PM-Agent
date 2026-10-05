import { NextRequest, NextResponse } from "next/server";
import { createItem, listItems, refreshJiraProgress } from "@/lib/roadmap";

export async function GET() {
  const items = await listItems();
  // Keep connected items' progress fresh without a separate manual refresh click.
  const refreshed = await Promise.all(
    items.map((i) => (i.jiraLink ? refreshJiraProgress(i.id).catch(() => i) : i))
  );
  return NextResponse.json({ items: refreshed });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!body.type) return NextResponse.json({ error: "type is required" }, { status: 400 });
  const item = await createItem(body);
  return NextResponse.json({ item });
}
