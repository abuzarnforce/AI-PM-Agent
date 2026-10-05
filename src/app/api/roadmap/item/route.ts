import { NextRequest, NextResponse } from "next/server";
import {
  addDecision,
  addDependency,
  addDiscussion,
  addRisk,
  deleteItem,
  updateDependency,
  updateItem,
  updateRisk,
} from "@/lib/roadmap";

/** One route per roadmap item, dispatched by `action` — mirrors the rest of this
 * app's sub-entity routes (standup follow-ups/blockers) but a roadmap item has
 * more attached collections, so PATCH takes an action instead of one per collection. */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, action } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    switch (action) {
      case "discussion":
        return NextResponse.json({ item: await addDiscussion(id, body.discussion) });
      case "decision":
        return NextResponse.json({ item: await addDecision(id, body.decision) });
      case "risk":
        return NextResponse.json({ item: await addRisk(id, body.risk) });
      case "risk_update":
        return NextResponse.json({ item: await updateRisk(id, body.riskId, body.patch) });
      case "dependency":
        return NextResponse.json({ item: await addDependency(id, body.description) });
      case "dependency_update":
        return NextResponse.json({ item: await updateDependency(id, body.depId, body.patch) });
      default:
        return NextResponse.json({ item: await updateItem(id, body.patch ?? {}) });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Something went wrong" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
