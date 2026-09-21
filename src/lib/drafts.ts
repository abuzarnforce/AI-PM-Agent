import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./kvStore";
import { createIssue, updateIssue, type NewIssueFields } from "./jira";
import { getJiraConfig } from "./config";

export type DraftKind = "new_story" | "update_story" | "prd" | "brd";
export type DraftStatus = "needs triage" | "ready for grooming" | "approved" | "rejected";

export interface Draft {
  id: string;
  kind: DraftKind;
  status: DraftStatus;
  title: string;
  body: string; // rendered markdown following the template in CLAUDE.md
  source: string; // ticket ID / meeting note / demo date, per Hard Rule 5
  createdAt: string;
  jiraAction?: {
    type: "create" | "update";
    projectKey?: string;
    issueType?: string;
    targetKey?: string;
    fields: Partial<NewIssueFields> & Record<string, unknown>;
  };
  result?: { key: string; url: string };
}

const DRAFTS_KEY = "drafts";

async function load(): Promise<Draft[]> {
  return (await readJson<Draft[]>(DRAFTS_KEY)) ?? [];
}

async function save(drafts: Draft[]): Promise<void> {
  await writeJson(DRAFTS_KEY, drafts);
}

export async function listDrafts(): Promise<Draft[]> {
  return (await load()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  return (await load()).find((d) => d.id === id);
}

export async function createDraft(
  input: Omit<Draft, "id" | "createdAt" | "status"> & { status?: DraftStatus }
): Promise<Draft> {
  const drafts = await load();
  const draft: Draft = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: input.status ?? "needs triage",
    ...input,
  };
  drafts.push(draft);
  await save(drafts);
  return draft;
}

/** The ONLY path by which this app is allowed to write to Jira: a PM must call
 * this explicitly (via POST /api/drafts/approve) against an existing draft. */
export async function approveDraft(id: string): Promise<Draft> {
  const drafts = await load();
  const draft = drafts.find((d) => d.id === id);
  if (!draft) throw new Error(`Draft ${id} not found`);
  if (draft.status === "approved") return draft;

  if (draft.jiraAction?.type === "create") {
    const { projectKey, issueType, fields } = draft.jiraAction;
    if (!projectKey || !issueType) {
      throw new Error("Draft is missing projectKey/issueType required to create the Jira issue.");
    }
    const result = await createIssue({
      projectKey,
      issueType,
      summary: draft.title,
      description: draft.body,
      ...fields,
    } as NewIssueFields);
    draft.result = result;
  } else if (draft.jiraAction?.type === "update") {
    if (!draft.jiraAction.targetKey) throw new Error("Draft is missing targetKey to update.");
    await updateIssue(draft.jiraAction.targetKey, draft.jiraAction.fields);
    draft.result = {
      key: draft.jiraAction.targetKey,
      url: `${(await getJiraConfig()).baseUrl}/browse/${draft.jiraAction.targetKey}`,
    };
  }

  draft.status = "approved";
  await save(drafts);
  return draft;
}

export async function rejectDraft(id: string): Promise<Draft> {
  const drafts = await load();
  const draft = drafts.find((d) => d.id === id);
  if (!draft) throw new Error(`Draft ${id} not found`);
  draft.status = "rejected";
  await save(drafts);
  return draft;
}
