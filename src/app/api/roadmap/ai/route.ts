import { NextRequest, NextResponse } from "next/server";
import { askRoadmap, getItem, jiraEpicsNotOnRoadmap, listItems, recommendForItem } from "@/lib/roadmap";

/** AI only ever recommends or answers here — it never writes to a roadmap item
 * or to Jira. Accepting a recommendation is a normal PATCH the PM triggers from
 * the UI (see /api/roadmap/item), same as any other manual edit. */
export async function POST(req: NextRequest) {
  const { mode, itemId, question } = await req.json();
  try {
    if (mode === "recommend") {
      const item = await getItem(itemId);
      if (!item) return NextResponse.json({ error: "Roadmap item not found" }, { status: 404 });
      return NextResponse.json({ recommendation: await recommendForItem(item) });
    }
    if (mode === "gaps") {
      const items = await listItems();
      return NextResponse.json({ epics: await jiraEpicsNotOnRoadmap(items) });
    }
    if (!question?.trim()) return NextResponse.json({ error: "question is required" }, { status: 400 });
    const answer = await askRoadmap(question, await listItems());
    return NextResponse.json({ answer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Something went wrong" }, { status: 400 });
  }
}
