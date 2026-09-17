import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { checkForDuplicates } from "@/lib/duplicates";
import { renderUserStory } from "@/lib/templates";
import { createDraft } from "@/lib/drafts";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "Gemini is not configured." }, { status: 400 });
  }
  const { rawText, source, projectKey } = (await req.json()) as {
    rawText: string;
    source: string;
    projectKey?: string;
  };
  if (!rawText?.trim() || !source?.trim()) {
    return NextResponse.json({ error: "rawText and source are required" }, { status: 400 });
  }

  try {
    const extractPrompt = `Extract the underlying product request from this raw note/comment/transcript excerpt.

Text: """${rawText}"""

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

    let duplicateCheck = null;
    if (isJiraConfigured() && projectKey) {
      duplicateCheck = await checkForDuplicates(projectKey, extracted.title, extracted.need);
      if (duplicateCheck.hasMatch) {
        return NextResponse.json({
          duplicateFound: true,
          duplicateCheck,
          extracted,
        });
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
      jiraAction: projectKey
        ? { type: "create", projectKey, issueType: "Story", fields: {} }
        : undefined,
    });

    return NextResponse.json({ duplicateFound: false, draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
