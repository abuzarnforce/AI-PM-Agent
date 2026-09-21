import { getGithubConfig, isGithubConfigured } from "./config";

export interface GithubCommit {
  sha: string;
  author: string;
  date: string;
  message: string;
}

export interface GithubPull {
  number: number;
  author: string;
  createdAt: string;
  mergedAt: string | null;
  baseBranch: string;
}

class GithubNotConfiguredError extends Error {
  constructor() {
    super("GitHub is not configured. Connect it from the Connector tab.");
    this.name = "GithubNotConfiguredError";
  }
}

/** Same defensive pattern as jira.ts's fetchWithRetry: this sandboxed dev environment
 * has shown transient connect timeouts under concurrent requests to one host. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const delays = [300, 800, 1500];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err: any) {
      if (attempt >= delays.length) {
        const cause = err?.cause ? ` (${err.cause.code ?? err.cause.message ?? err.cause})` : "";
        throw new Error(`Could not reach GitHub: ${err.message}${cause}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

async function githubFetch(path: string): Promise<any> {
  if (!(await isGithubConfigured())) throw new GithubNotConfiguredError();
  const { token } = await getGithubConfig();
  const res = await fetchWithRetry(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

/** Runs fetches with limited concurrency — mirrors jira.ts's mapWithConcurrency,
 * kept local since GitHub's higher rate limit allows more parallelism than Jira did. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function paginate(pathWithoutPage: string, sep: string): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await githubFetch(`${pathWithoutPage}${sep}per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function testAccess(owner: string, repo: string): Promise<{ fullName: string; defaultBranch: string }> {
  const data = await githubFetch(`/repos/${owner}/${repo}`);
  return { fullName: data.full_name, defaultBranch: data.default_branch };
}

export async function listBranches(owner: string, repo: string): Promise<string[]> {
  const data = await paginate(`/repos/${owner}/${repo}/branches?`, "");
  return data.map((b: any) => b.name);
}

export async function listCommits(
  owner: string,
  repo: string,
  branch: string,
  since: string
): Promise<GithubCommit[]> {
  const data = await paginate(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${encodeURIComponent(since)}&`,
    ""
  );
  return data.map((c: any) => ({
    sha: c.sha,
    author: c.author?.login ?? c.commit?.author?.name ?? c.commit?.author?.email ?? "unknown",
    date: c.commit?.author?.date ?? "",
    message: (c.commit?.message ?? "").split("\n")[0],
  }));
}

/** Sorted by creation date descending, so we can stop paging as soon as a whole page
 * falls before `since` — avoids walking a long-lived repo's entire PR history just to
 * report the last 30 days. */
export async function listPullRequests(owner: string, repo: string, since: string): Promise<GithubPull[]> {
  const sinceTime = new Date(since).getTime();
  const all: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await githubFetch(
      `/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&per_page=100&page=${page}`
    );
    if (batch.length === 0) break;
    all.push(...batch);
    const oldestInBatch = new Date(batch[batch.length - 1].created_at).getTime();
    if (oldestInBatch < sinceTime || batch.length < 100) break;
  }
  return all
    .filter((p: any) => new Date(p.created_at).getTime() >= sinceTime)
    .map((p: any) => ({
      number: p.number,
      author: p.user?.login ?? "unknown",
      createdAt: p.created_at,
      mergedAt: p.merged_at,
      baseBranch: p.base?.ref ?? "",
    }));
}

export { mapWithConcurrency };
