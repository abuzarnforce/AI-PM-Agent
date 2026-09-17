import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createIssue, updateIssue, type NewIssueFields } from "./jira";
import { getJiraConfig } from "./config";

export type DraftKind = "new_story" | "update_story" | "prd";
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

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "drafts.json");

function load(): Draft[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function save(drafts: Draft[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(drafts, null, 2), "utf-8");
}

export function listDrafts(): Draft[] {
  return load().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getDraft(id: string): Draft | undefined {
  return load().find((d) => d.id === id);
}

export function createDraft(input: Omit<Draft, "id" | "createdAt" | "status"> & { status?: DraftStatus }): Draft {
  const drafts = load();
  const draft: Draft = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: input.status ?? "needs triage",
    ...input,
  };
  drafts.push(draft);
  save(drafts);
  return draft;
}

/** The ONLY path by which this app is allowed to write to Jira: a PM must call
 * this explicitly (via POST /api/drafts/approve) against an existing draft. */
export async function approveDraft(id: string): Promise<Draft> {
  const drafts = load();
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
      url: `${getJiraConfig().baseUrl}/browse/${draft.jiraAction.targetKey}`,
    };
  }

  draft.status = "approved";
  save(drafts);
  return draft;
}

export function rejectDraft(id: string): Draft {
  const drafts = load();
  const draft = drafts.find((d) => d.id === id);
  if (!draft) throw new Error(`Draft ${id} not found`);
  draft.status = "rejected";
  save(drafts);
  return draft;
}
