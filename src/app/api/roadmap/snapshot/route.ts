import { NextRequest, NextResponse } from "next/server";
import { createSnapshot, diffSnapshot, listItems, listSnapshots } from "@/lib/roadmap";

export async function GET(req: NextRequest) {
  const snapshots = await listSnapshots();
  const compareId = req.nextUrl.searchParams.get("compare");
  if (!compareId) return NextResponse.json({ snapshots });

  const snapshot = snapshots.find((s) => s.id === compareId);
  if (!snapshot) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  const changes = diffSnapshot(snapshot, await listItems());
  return NextResponse.json({ snapshots, changes });
}

export async function POST(req: NextRequest) {
  const { label } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "label is required" }, { status: 400 });
  const snapshot = await createSnapshot(label.trim());
  return NextResponse.json({ snapshot });
}
