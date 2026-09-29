import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { isGeminiConfigured } from "@/lib/config";

interface SummaryResult {
  teamStatus: string;
  attentionNeeded: string[];
  deliveryRisk: string[];
  carryOver: string[];
  pmActions: string[];
}

/** Summarizes today's already-fetched standup data — no extra Jira calls here,
 * the client passes what /api/standup already loaded. */
export async function POST(req: NextRequest) {
  if (!(await isGeminiConfigured())) {
    return NextResponse.json({ error: "AI engine is not configured." }, { status: 400 });
  }
  const { date, team, updates, followups, blockers, jiraByMember } = await req.json();

  const memberName = (id: string) => team.find((m: any) => m.id === id)?.name ?? "Unknown";

  const updateLines = updates.length
    ? updates
        .map(
          (u: any) =>
            `${memberName(u.memberId)} [${u.confidence}] — Yesterday: ${u.yesterday || "(none)"} | Today: ${u.today || "(none)"} | Blockers: ${u.blockers || "(none)"}`
        )
        .join("\n")
    : "No standup updates submitted yet for this date.";

  const jiraLines = Object.entries(jiraByMember ?? {})
    .flatMap(([memberId, issues]: [string, any]) =>
      (issues as any[]).map((i) => `${i.key} [${i.status}] ${i.summary} (assignee: ${memberName(memberId)})`)
    )
    .join("\n");

  const followupLines = (followups ?? [])
    .filter((f: any) => f.status !== "Completed" && f.status !== "Cancelled")
    .map((f: any) => `${f.title} — owner: ${f.ownerId ? memberName(f.ownerId) : "unassigned"}, due: ${f.dueDate ?? "no date"}, priority: ${f.priority}, status: ${f.status}`)
    .join("\n");

  const blockerLines = (blockers ?? [])
    .filter((b: any) => b.status !== "Resolved" && b.status !== "Closed")
    .map((b: any) => `${b.title} — owner: ${b.ownerId ? memberName(b.ownerId) : "unassigned"}, severity: ${b.severity}, status: ${b.status}, reported: ${b.reportedAt}`)
    .join("\n");

  const prompt = `You are helping a Product Manager prepare for/review daily standup on ${date}.

Team updates:
${updateLines}

Jira work in flight:
${jiraLines || "No Jira data available."}

Open follow-ups (not tracked in Jira):
${followupLines || "None."}

Active blockers:
${blockerLines || "None."}

Base every statement ONLY on the data above. Never invent names, tickets, or facts. If there isn't
enough data for a section, say "Not enough data to determine." Return JSON:
{
  "teamStatus": string,          // one or two sentences
  "attentionNeeded": string[],   // things needing PM attention, cite names/tickets
  "deliveryRisk": string[],      // work that may slip, cite tickets/reasons
  "carryOver": string[],         // commitments/follow-ups repeating from a prior day
  "pmActions": string[]          // concrete next actions for the PM
}`;

  try {
    const summary = await generateJson<SummaryResult>(prompt);
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
