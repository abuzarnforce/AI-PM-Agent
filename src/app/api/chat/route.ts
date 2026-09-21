import { NextRequest, NextResponse } from "next/server";
import { searchIssues } from "@/lib/jira";
import { generateJson } from "@/lib/gemini";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";

const SYSTEM_INSTRUCTION = `You are an AI Product Manager Assistant chatbot, speaking to a PM in a chat
window. Answer the way a sharp, friendly colleague would in Slack — plain, direct sentences, not a report.
Use ONLY the Jira issues provided as context, and cite the ticket key inline for every claim (e.g. "ONEHR-461").
If the provided context doesn't contain the answer, say so plainly instead of guessing.
End with a short offer to go deeper (e.g. "want the full list?") rather than dumping everything by default —
but don't repeat that offer verbatim every time; vary the phrasing naturally like a person would.
Two different phrasings of the same underlying question should get materially the same answer: judge intent,
not exact wording.`;

const JQL_SYSTEM_INSTRUCTION = `You write Jira JQL. Follow Jira's JQL grammar exactly:
- Every clause must be joined with a keyword: "AND", "OR", "NOT" — never place two clauses back to back
  with just a space (e.g. "assignee = currentUser() updated >= -365d" is INVALID; it must be
  "assignee = currentUser() AND updated >= -365d").
- Wrap string/date literal values in double quotes; leave function calls like currentUser() and
  relative dates like -365d unquoted.
- Prefer statusCategory (To Do / In Progress / Done) over guessing custom status names.
- Only add ORDER BY at the very end, after every other clause, never in the middle.
- Return ONLY the JQL string, no explanation.`;

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini is not configured. Connect it from the Connector tab." },
      { status: 400 }
    );
  }
  if (!isJiraConfigured()) {
    return NextResponse.json(
      { error: "Jira is not configured. Connect it from the Connector tab." },
      { status: 400 }
    );
  }

  const { message, projectKey } = (await req.json()) as { message: string; projectKey?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const basePrompt = `Convert this product manager question into a single Jira JQL query.
${projectKey ? `Scope it to project = "${projectKey}".` : "No project scoping given; search across accessible projects."}
Jira's search API rejects unbounded queries, so the JQL MUST include at least one restricting
clause (project, assignee, reporter, a status/issuetype filter, or a date bound like
"updated >= -365d"). If nothing else fits, add "updated >= -365d" as a safety bound, joined with AND.
Question: "${message}"
Return JSON: { "jql": string }`;

    const { jql, issues } = await searchWithSelfRepair(basePrompt);

    const answerPrompt = `PM question: "${message}"

Jira issues found (JQL: ${jql}):
${issues.map((i) => `${i.key} [${i.status}] ${i.summary} (updated ${i.updated})`).join("\n") || "(no issues found)"}

Return JSON: { "answer": string, "sources": string[] }
"sources" must be the Jira issue keys you actually cited in "answer".`;

    const { answer, sources } = await generateJson<{ answer: string; sources: string[] }>(
      answerPrompt,
      SYSTEM_INSTRUCTION
    );

    return NextResponse.json({ answer, sources, jql, resultCount: issues.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

/** Gemini's first JQL attempt occasionally comes back syntactically invalid (e.g. two clauses
 * mashed together without AND). Rather than surfacing that straight to the PM as a raw Jira
 * error, feed Jira's own error message back to Gemini and let it correct itself a couple of
 * times before giving up. */
async function searchWithSelfRepair(basePrompt: string): Promise<{ jql: string; issues: Awaited<ReturnType<typeof searchIssues>> }> {
  let prompt = basePrompt;
  let lastJql = "";
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { jql } = await generateJson<{ jql: string }>(prompt, JQL_SYSTEM_INSTRUCTION);
    lastJql = jql;
    try {
      const issues = await searchIssues(jql, 30);
      return { jql, issues };
    } catch (err: any) {
      if (attempt === maxAttempts - 1) throw err;
      prompt = `${basePrompt}\n\nYour previous JQL was: ${jql}\nJira rejected it with this error: ${err.message}\nFix the JQL so it is valid, keeping the same intent.`;
    }
  }
  // Unreachable, but keeps TypeScript happy.
  return { jql: lastJql, issues: [] };
}
