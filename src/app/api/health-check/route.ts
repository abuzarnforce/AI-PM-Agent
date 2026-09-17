import { NextRequest, NextResponse } from "next/server";
import { searchIssues, getIssue } from "@/lib/jira";
import { generateJson } from "@/lib/gemini";
import { renderHealthCheck, type HealthCheckReport } from "@/lib/templates";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";

export async function POST(req: NextRequest) {
  if (!isJiraConfigured() || !isGeminiConfigured()) {
    return NextResponse.json({ error: "Jira and Gemini must both be configured." }, { status: 400 });
  }

  const { epicKey, sprintName, staleDays } = (await req.json()) as {
    epicKey?: string;
    sprintName?: string;
    staleDays?: number;
  };
  if (!epicKey && !sprintName) {
    return NextResponse.json({ error: "Provide epicKey or sprintName." }, { status: 400 });
  }
  const N = staleDays ?? 14;

  try {
    const jql = epicKey
      ? `"Epic Link" = ${epicKey} OR parent = ${epicKey}`
      : `sprint = "${sprintName}"`;
    const issues = await searchIssues(jql, 100);

    const now = Date.now();
    const daysSince = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86400000);

    const missingAcceptanceCriteria = issues
      .filter((i) => !i.acceptanceCriteria)
      .map((i) => ({ key: i.key, summary: i.summary }));
    const unestimated = issues
      .filter((i) => i.storyPoints == null)
      .map((i) => ({ key: i.key, summary: i.summary }));
    const stale = issues
      .filter((i) => daysSince(i.updated) >= N)
      .map((i) => ({ key: i.key, summary: i.summary, daysSinceUpdate: daysSince(i.updated) }));

    let epicDescription = "";
    if (epicKey) {
      const epic = await getIssue(epicKey);
      epicDescription = epic.description;
    }

    const analysisPrompt = `Analyze this epic/sprint for a PM health check.

${epicDescription ? `Original epic description:\n${epicDescription}\n` : ""}
Issues in scope (key, type, status, summary):
${issues.map((i) => `${i.key} [${i.issueType}/${i.status}] ${i.summary}`).join("\n")}

Return JSON:
{
  "scopeDrift": string[],        // ways current issues diverge from the original epic intent; cite ticket keys; [] if none or no epic description given
  "qaCoverageGaps": string[],    // guess only from ticket summaries/status if no QA data attached; say "no QA data attached" if you cannot assess this
  "verdict": "on track" | "at risk" | "blocked",
  "verdictReason": string
}`;

    const analysis = await generateJson<{
      scopeDrift: string[];
      qaCoverageGaps: string[];
      verdict: HealthCheckReport["verdict"];
      verdictReason: string;
    }>(analysisPrompt);

    const report: HealthCheckReport = {
      epicOrSprint: epicKey ?? sprintName ?? "",
      missingAcceptanceCriteria,
      unestimated,
      stale,
      scopeDrift: analysis.scopeDrift,
      qaCoverageGaps: analysis.qaCoverageGaps,
      verdict: analysis.verdict,
      verdictReason: analysis.verdictReason,
    };

    return NextResponse.json({ report, markdown: renderHealthCheck(report) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
