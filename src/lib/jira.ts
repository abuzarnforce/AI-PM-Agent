import { getJiraConfig, isJiraConfigured } from "./config";

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  assignee: string | null;
  updated: string;
  created: string;
  description: string;
  storyPoints: number | null;
  epicKey: string | null;
  acceptanceCriteria: string | null;
  labels: string[];
  url: string;
}

export interface JiraComment {
  author: string;
  body: string;
  created: string;
}

class JiraNotConfiguredError extends Error {
  constructor() {
    super("Jira is not configured. Connect it from the Connector tab.");
    this.name = "JiraNotConfiguredError";
  }
}

function authHeader(): string {
  const { email, apiToken } = getJiraConfig();
  const raw = `${email}:${apiToken}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

/** Transient connection hiccups (cold TCP/TLS handshake, brief network blips) happen
 * occasionally and aren't Jira's or the user's fault — retry a couple of times before
 * surfacing an error, same approach as the Gemini transient-error handling. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const delays = [300, 800, 1500];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: any) {
      if (attempt >= delays.length) {
        const cause = err?.cause ? ` (${err.cause.code ?? err.cause.message ?? err.cause})` : "";
        throw new Error(`Could not reach Jira: ${err.message}${cause}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

async function jiraFetch(path: string, init?: RequestInit): Promise<any> {
  if (!isJiraConfigured()) throw new JiraNotConfiguredError();
  const res = await fetchWithRetry(`${getJiraConfig().baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira API error ${res.status}: ${text.slice(0, 500)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function adfToText(adf: any): string {
  if (!adf) return "";
  if (typeof adf === "string") return adf;
  let out = "";
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === "text") out += node.text ?? "";
    if (node.type === "paragraph") out += "\n";
    for (const child of node.content ?? []) walk(child);
  };
  walk(adf);
  return out.trim();
}

function mapIssue(raw: any): JiraIssue {
  const f = raw.fields ?? {};
  return {
    key: raw.key,
    summary: f.summary ?? "",
    status: f.status?.name ?? "Unknown",
    issueType: f.issuetype?.name ?? "Unknown",
    assignee: f.assignee?.displayName ?? null,
    updated: f.updated ?? "",
    created: f.created ?? "",
    description: adfToText(f.description),
    storyPoints: f.customfield_10016 ?? f.storyPoints ?? null,
    epicKey: f.parent?.key ?? f.epic?.key ?? null,
    acceptanceCriteria: f.customfield_10100 ? adfToText(f.customfield_10100) : null,
    labels: f.labels ?? [],
    url: `${getJiraConfig().baseUrl}/browse/${raw.key}`,
  };
}

/** Fast aggregate count for a bounded JQL query, via Jira's approximate-count
 * endpoint — used to build our own live stat widgets without paging through
 * every issue. "Approximate" per Atlassian's naming, but accurate in practice
 * for dashboard-style counts. */
export async function approximateCount(jql: string): Promise<number> {
  const data = await jiraFetch(`/rest/api/3/search/approximate-count`, {
    method: "POST",
    body: JSON.stringify({ jql }),
  });
  return data.count as number;
}

/** Search issues by JQL. Accepts a plain-language hint too, which is passed through
 * as-is if it already looks like JQL, otherwise the caller (chat route) should
 * convert it to JQL via Gemini before calling this.
 *
 * Uses POST /rest/api/3/search/jql — the old GET /rest/api/3/search was removed
 * by Atlassian (see https://developer.atlassian.com/changelog/#CHANGE-2046). */
export async function searchIssues(jql: string, maxResults = 50): Promise<JiraIssue[]> {
  const data = await jiraFetch(`/rest/api/3/search/jql`, {
    method: "POST",
    body: JSON.stringify({
      jql,
      maxResults,
      fields: ["summary", "status", "issuetype", "assignee", "updated", "created", "description", "labels", "parent"],
    }),
  });
  return (data.issues ?? []).map(mapIssue);
}

export async function getIssue(key: string): Promise<JiraIssue> {
  const raw = await jiraFetch(`/rest/api/3/issue/${key}`);
  return mapIssue(raw);
}

export async function getIssueComments(key: string): Promise<JiraComment[]> {
  const data = await jiraFetch(`/rest/api/3/issue/${key}/comment`);
  return (data.comments ?? []).map((c: any) => ({
    author: c.author?.displayName ?? "Unknown",
    body: adfToText(c.body),
    created: c.created,
  }));
}

export interface NewIssueFields {
  projectKey: string;
  issueType: string;
  summary: string;
  description: string;
  labels?: string[];
  epicKey?: string;
}

/** Actually creates the issue in Jira. Only ever called after explicit PM approval
 * (see src/lib/drafts.ts) — never call this directly from a route handler. */
export async function createIssue(fields: NewIssueFields): Promise<{ key: string; url: string }> {
  const body = {
    fields: {
      project: { key: fields.projectKey },
      issuetype: { name: fields.issueType },
      summary: fields.summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: fields.description }],
          },
        ],
      },
      labels: fields.labels ?? [],
      ...(fields.epicKey ? { parent: { key: fields.epicKey } } : {}),
    },
  };
  const data = await jiraFetch(`/rest/api/3/issue`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { key: data.key, url: `${getJiraConfig().baseUrl}/browse/${data.key}` };
}

/** Actually updates the issue in Jira. Only ever called after explicit PM approval. */
export async function updateIssue(key: string, fields: Record<string, unknown>): Promise<void> {
  await jiraFetch(`/rest/api/3/issue/${key}`, {
    method: "PUT",
    body: JSON.stringify({ fields }),
  });
}
