import { NextRequest, NextResponse } from "next/server";
import { searchIssues, getIssue } from "@/lib/jira";
import { generateJson } from "@/lib/gemini";
import { renderHealthCheck, type HealthCheckReport } from "@/lib/templates";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";
import { getQaSnapshot } from "@/lib/qaSheetStore";

export async function POST(req: NextRequest) {
  if (!(await isJiraConfigured()) || !(await isGeminiConfigured())) {
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

    // If a QA tracking sheet has been uploaded (QA Dashboard tab), give Gemini the
    // real regression/test-case/automation numbers instead of asking it to guess
    // coverage from ticket summaries alone.
    const qa = await getQaSnapshot();
    const inScopeKeys = new Set(issues.map((i) => i.key));
    let qaContext = "No QA tracking sheet has been uploaded — do not guess coverage; say so plainly.";
    if (qa) {
      const parts: string[] = [];
      if (qa.regression) {
        const r = qa.regression;
        parts.push(
          `Regression suite: ${r.pass} pass, ${r.fail} fail, ${r.blocked} blocked, ${r.notExecuted} not executed (${r.executionPct}% executed).`
        );
        if (r.failingOrBlocked.length) {
          parts.push(
            `Currently failing/blocked scenarios:\n${r.failingOrBlocked
              .map((f) => `- [${f.result}] ${f.feature}: ${f.scenario} (${f.assignee}${f.remark ? `, ${f.remark}` : ""})`)
              .join("\n")}`
          );
        }
      }
      if (qa.testcaseTracker) {
        parts.push(`Test case tracker: ${qa.testcaseTracker.done}/${qa.testcaseTracker.total} test cases done.`);
      }
      if (qa.automation) {
        const a = qa.automation;
        parts.push(`Automation: ${a.done} done, ${a.inProgress} in progress, ${a.notStarted} not started (of ${a.total} scenarios).`);
      }
      qaContext = parts.length
        ? `From the team's QA tracking sheet (uploaded ${qa.uploadedAt}):\n${parts.join("\n\n")}\n\nNote: this QA data isn't scoped to this specific epic/sprint's tickets — treat it as overall project QA health, and only call out a gap for THIS epic/sprint if a failing/blocked scenario or ticket key clearly relates to one of the issues in scope (${[...inScopeKeys].join(", ") || "none"}).`
        : qaContext;
    }

    const analysisPrompt = `Analyze this epic/sprint for a PM health check.

${epicDescription ? `Original epic description:\n${epicDescription}\n` : ""}
Issues in scope (key, type, status, summary):
${issues.map((i) => `${i.key} [${i.issueType}/${i.status}] ${i.summary}`).join("\n")}

QA data:
${qaContext}

Return JSON:
{
  "scopeDrift": string[],        // ways current issues diverge from the original epic intent; cite ticket keys; [] if none or no epic description given
  "qaCoverageGaps": string[],    // based on the QA data above; cite specific scenarios/features; say "no QA data attached" only if none was provided
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
