import { searchIssues, type JiraIssue } from "./jira";
import { generateJson } from "./gemini";

export interface DuplicateCheckResult {
  hasMatch: boolean;
  matches: { key: string; summary: string; confidence: "low" | "medium" | "high"; reason: string }[];
}

/** Hard Rule 2: before drafting any new story, search the backlog for
 * duplicates/near-duplicates and surface them instead of creating a new one. */
export async function checkForDuplicates(
  projectKey: string,
  candidateSummary: string,
  candidateDescription: string
): Promise<DuplicateCheckResult> {
  const jql = `project = "${projectKey}" AND statusCategory != Done ORDER BY updated DESC`;
  const candidates = await searchIssues(jql, 40);

  if (candidates.length === 0) return { hasMatch: false, matches: [] };

  const prompt = `You are checking a new proposed backlog item for duplicates against existing open Jira issues.

New item:
Summary: ${candidateSummary}
Description: ${candidateDescription}

Existing open issues (key: summary):
${candidates.map((c: JiraIssue) => `${c.key}: ${c.summary}`).join("\n")}

Return JSON: { "matches": [{ "key": string, "confidence": "low"|"medium"|"high", "reason": string }] }
Only include issues that are plausibly the same request or a near-duplicate. Omit unrelated issues entirely.`;

  const result = await generateJson<{
    matches: { key: string; confidence: "low" | "medium" | "high"; reason: string }[];
  }>(prompt);

  const matches = result.matches
    .map((m) => {
      const issue = candidates.find((c) => c.key === m.key);
      return issue ? { key: m.key, summary: issue.summary, confidence: m.confidence, reason: m.reason } : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return { hasMatch: matches.length > 0, matches };
}
