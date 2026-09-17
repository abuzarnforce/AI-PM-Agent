import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { checkForDuplicates } from "@/lib/duplicates";
import { renderUserStory, renderPrd, renderBrd } from "@/lib/templates";
import { createDraft } from "@/lib/drafts";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";

type StudioKind = "user_story" | "prd" | "brd";

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "Gemini is not configured. Connect it from the Connector tab." }, { status: 400 });
  }

  const { kind, brief, source, projectKey } = (await req.json()) as {
    kind: StudioKind;
    brief: string;
    source: string;
    projectKey?: string;
  };
  if (!kind || !brief?.trim() || !source?.trim()) {
    return NextResponse.json({ error: "kind, brief, and source are required" }, { status: 400 });
  }

  try {
    if (kind === "user_story") {
      const extractPrompt = `Draft a user story from this brief.

Brief: """${brief}"""

Return JSON:
{
  "title": string,
  "persona": string,
  "need": string,
  "benefit": string,
  "acceptanceCriteria": [{ "given": string, "when": string, "then": string }]
}`;
      const extracted = await generateJson<{
        title: string;
        persona: string;
        need: string;
        benefit: string;
        acceptanceCriteria: { given: string; when: string; then: string }[];
      }>(extractPrompt);

      if (isJiraConfigured() && projectKey) {
        const duplicateCheck = await checkForDuplicates(projectKey, extracted.title, extracted.need);
        if (duplicateCheck.hasMatch) {
          return NextResponse.json({ duplicateFound: true, duplicateCheck, extracted });
        }
      }

      const body = renderUserStory({
        title: extracted.title,
        persona: extracted.persona,
        need: extracted.need,
        benefit: extracted.benefit,
        acceptanceCriteria: extracted.acceptanceCriteria,
        source,
        status: "needs triage",
      });
      const draft = createDraft({
        kind: "new_story",
        title: extracted.title,
        body,
        source,
        jiraAction: projectKey ? { type: "create", projectKey, issueType: "Story", fields: {} } : undefined,
      });
      return NextResponse.json({ duplicateFound: false, draft });
    }

    if (kind === "prd") {
      const prompt = `Draft a PRD from this brief.

Brief: """${brief}"""

Return JSON:
{
  "title": string,
  "problemStatement": string,
  "goals": string[],
  "nonGoals": string[],
  "successMetrics": string[],
  "scopeIn": string[],
  "scopeOut": string[],
  "risksAndOpenQuestions": string[],
  "rolloutPlan": string
}`;
      const extracted = await generateJson<{
        title: string;
        problemStatement: string;
        goals: string[];
        nonGoals: string[];
        successMetrics: string[];
        scopeIn: string[];
        scopeOut: string[];
        risksAndOpenQuestions: string[];
        rolloutPlan: string;
      }>(prompt);

      const body = renderPrd(extracted);
      const draft = createDraft({ kind: "prd", title: extracted.title, body, source });
      return NextResponse.json({ duplicateFound: false, draft });
    }

    if (kind === "brd") {
      const prompt = `Draft a BRD (Business Requirements Document) from this brief.

Brief: """${brief}"""

Return JSON:
{
  "title": string,
  "businessObjective": string,
  "background": string,
  "stakeholders": string[],
  "businessRequirements": string[],
  "assumptionsAndConstraints": string[],
  "successCriteria": string[],
  "outOfScope": string[]
}`;
      const extracted = await generateJson<{
        title: string;
        businessObjective: string;
        background: string;
        stakeholders: string[];
        businessRequirements: string[];
        assumptionsAndConstraints: string[];
        successCriteria: string[];
        outOfScope: string[];
      }>(prompt);

      const body = renderBrd(extracted);
      const draft = createDraft({ kind: "brd", title: extracted.title, body, source });
      return NextResponse.json({ duplicateFound: false, draft });
    }

    return NextResponse.json({ error: "kind must be 'user_story', 'prd', or 'brd'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
