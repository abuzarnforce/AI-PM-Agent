import { NextRequest, NextResponse } from "next/server";
import { searchIssues, type JiraIssue } from "@/lib/jira";
import { isJiraConfigured } from "@/lib/config";
import { listTeam, listUpdates, listFollowUps, listBlockers } from "@/lib/standup";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayIso();

  const [team, updates, followups, blockers] = await Promise.all([
    listTeam(),
    listUpdates(date),
    listFollowUps(),
    listBlockers(),
  ]);

  // One batched Jira call for the whole team instead of one per member (see
  // repo rule against N Jira calls for N team members).
  let jiraByMember: Record<string, JiraIssue[]> = {};
  let jiraError: string | null = null;
  if (team.length && (await isJiraConfigured())) {
    try {
      const names = team.map((m) => `"${(m.jiraDisplayName || m.name).replace(/"/g, '\\"')}"`).join(", ");
      const issues = await searchIssues(`assignee in (${names}) ORDER BY updated DESC`, 200);
      jiraByMember = {};
      for (const member of team) {
        const label = member.jiraDisplayName || member.name;
        jiraByMember[member.id] = issues.filter((i) => i.assignee === label);
      }
    } catch (err: any) {
      jiraError = err.message ?? "Jira synchronization failed.";
    }
  }

  const allIssues = Object.values(jiraByMember).flat();
  const now = Date.now();
  const isOverdue = (due: string | null) => !!due && new Date(due).getTime() < now;

  const kpis = {
    teamMembers: team.length,
    inProgress: allIssues.filter((i) => /in progress/i.test(i.status)).length,
    completed: allIssues.filter((i) => /done|closed|resolved/i.test(i.status)).length,
    blocked: blockers.filter((b) => b.status !== "Resolved" && b.status !== "Closed").length,
    followUps: followups.filter((f) => f.status !== "Completed" && f.status !== "Cancelled").length,
    overdue:
      followups.filter((f) => f.status !== "Completed" && f.status !== "Cancelled" && isOverdue(f.dueDate)).length +
      blockers.filter((b) => b.status !== "Resolved" && b.status !== "Closed" && Date.now() - new Date(b.reportedAt).getTime() > 3 * 86400000).length,
    atRisk: updates.filter((u) => u.confidence === "at_risk" || u.confidence === "blocked").length,
  };

  return NextResponse.json({ date, team, updates, followups, blockers, jiraByMember, jiraError, kpis });
}
