import { NextRequest, NextResponse } from "next/server";
import { searchIssues } from "@/lib/jira";
import { generateJson } from "@/lib/gemini";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";

const SYSTEM_INSTRUCTION = `You are an AI Product Manager Assistant chatbot. Answer conversationally,
using ONLY the Jira issues provided as context. Cite the Jira ticket key inline for every claim you make.
If the provided context doesn't contain the answer, say so plainly instead of guessing.
Offer to go deeper (e.g. list affected tickets) rather than dumping everything by default.`;

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local." },
      { status: 400 }
    );
  }
  if (!isJiraConfigured()) {
    return NextResponse.json(
      { error: "Jira is not configured. Add JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to .env.local." },
      { status: 400 }
    );
  }

  const { message, projectKey } = (await req.json()) as { message: string; projectKey?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const jqlPrompt = `Convert this product manager question into a single Jira JQL query.
${projectKey ? `Scope it to project = "${projectKey}".` : "No project scoping given; search across accessible projects."}
Question: "${message}"
Return JSON: { "jql": string }`;
    const { jql } = await generateJson<{ jql: string }>(jqlPrompt);

    const issues = await searchIssues(jql, 30);

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
