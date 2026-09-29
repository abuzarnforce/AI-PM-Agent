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

async function authHeader(): Promise<string> {
  const { email, apiToken } = await getJiraConfig();
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
  if (!(await isJiraConfigured())) throw new JiraNotConfiguredError();
  const [{ baseUrl }, auth] = await Promise.all([getJiraConfig(), authHeader()]);
  const res = await fetchWithRetry(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
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

function mapIssue(raw: any, baseUrl: string): JiraIssue {
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
    url: `${baseUrl}/browse/${raw.key}`,
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
  const [data, { baseUrl }] = await Promise.all([
    jiraFetch(`/rest/api/3/search/jql`, {
      method: "POST",
      body: JSON.stringify({
        jql,
        maxResults,
        fields: ["summary", "status", "issuetype", "assignee", "updated", "created", "description", "labels", "parent"],
      }),
    }),
    getJiraConfig(),
  ]);
  return (data.issues ?? []).map((raw: any) => mapIssue(raw, baseUrl));
}

export interface JiraProject {
  key: string;
  name: string;
}

export async function getProjects(): Promise<JiraProject[]> {
  const data = await jiraFetch(`/rest/api/3/project/search`);
  return (data?.values ?? []).map((p: any) => ({ key: p.key, name: p.name }));
}

export interface JiraVersion {
  id: string;
  name: string;
  released: boolean;
}

export async function getVersions(projectKey: string): Promise<JiraVersion[]> {
  const data = await jiraFetch(`/rest/api/3/project/${encodeURIComponent(projectKey)}/versions`);
  return (data ?? []).map((v: any) => ({ id: v.id, name: v.name, released: !!v.released }));
}

/** Exact status counts for a JQL scope (e.g. one fixVersion) — approximateCount
 * only gives a total, not a breakdown, so this pages through /search/jql fetching
 * just the status field (light payload) and tallies client-side. Capped at a few
 * pages so a huge scope can't turn a dashboard widget into a slow crawl. */
export async function getStatusBreakdown(jql: string, maxPages = 5): Promise<{ status: string; count: number }[]> {
  const counts = new Map<string, number>();
  let nextPageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const data = await jiraFetch(`/rest/api/3/search/jql`, {
      method: "POST",
      body: JSON.stringify({ jql, maxResults: 100, fields: ["status"], ...(nextPageToken ? { nextPageToken } : {}) }),
    });
    for (const raw of data.issues ?? []) {
      const name = raw.fields?.status?.name ?? "Unknown";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }
  return [...counts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export async function getIssue(key: string): Promise<JiraIssue> {
  const [raw, { baseUrl }] = await Promise.all([jiraFetch(`/rest/api/3/issue/${key}`), getJiraConfig()]);
  return mapIssue(raw, baseUrl);
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
  const [data, { baseUrl }] = await Promise.all([
    jiraFetch(`/rest/api/3/issue`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    getJiraConfig(),
  ]);
  return { key: data.key, url: `${baseUrl}/browse/${data.key}` };
}

/** Actually updates the issue in Jira. Only ever called after explicit PM approval. */
export async function updateIssue(key: string, fields: Record<string, unknown>): Promise<void> {
  await jiraFetch(`/rest/api/3/issue/${key}`, {
    method: "PUT",
    body: JSON.stringify({ fields }),
  });
}
