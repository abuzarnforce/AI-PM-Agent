import { listBranches, listCommits, listPullRequests, mapWithConcurrency, type GithubCommit, type GithubPull } from "./github";

const WINDOW_DAYS = 30;

export interface RepoActivitySnapshot {
  generatedAt: string;
  owner: string;
  repo: string;
  branches: { name: string; commitCount: number }[];
  committers: { author: string; commitCount: number; branches: string[] }[];
  pulls: {
    opened: number;
    merged: number;
    byAuthor: { author: string; opened: number; merged: number }[];
  };
  today: { commits: number; pullsOpened: number; pullsMerged: number };
}

function isSameUtcDay(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === reference.getUTCFullYear() &&
    d.getUTCMonth() === reference.getUTCMonth() &&
    d.getUTCDate() === reference.getUTCDate()
  );
}

/** Computes a fresh activity snapshot straight from the GitHub API. Called by both the
 * daily cron route and the manual "Refresh now" route — the only place this aggregation
 * logic lives, so the two never drift. */
export async function computeSnapshot(fullRepo: string): Promise<RepoActivitySnapshot> {
  const [owner, repo] = fullRepo.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo "${fullRepo}", expected "owner/name".`);

  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const now = new Date();

  const branchNames = await listBranches(owner, repo);

  const commitsByBranch = await mapWithConcurrency(branchNames, 5, async (branch) => ({
    branch,
    commits: await listCommits(owner, repo, branch, since).catch(() => [] as GithubCommit[]),
  }));

  const pulls: GithubPull[] = await listPullRequests(owner, repo, since);

  const branches = commitsByBranch.map(({ branch, commits }) => ({
    name: branch,
    commitCount: commits.length,
  }));

  // Feature branches share history with the branch they were cut from, so the same
  // commit SHA legitimately shows up on many branches at once. Counting it once per
  // branch would massively inflate "who's pushing the most" — dedupe by SHA globally
  // for the committer ranking and the "today" total; the per-branch tile above is the
  // one place raw per-branch totals are the right (and expected) number.
  const seenShas = new Map<string, { author: string; date: string; branches: Set<string> }>();
  for (const { branch, commits } of commitsByBranch) {
    for (const c of commits) {
      const entry = seenShas.get(c.sha) ?? { author: c.author, date: c.date, branches: new Set<string>() };
      entry.branches.add(branch);
      seenShas.set(c.sha, entry);
    }
  }

  const committerMap = new Map<string, { commitCount: number; branches: Set<string> }>();
  let todayCommits = 0;
  for (const { author, date, branches: shaBranches } of seenShas.values()) {
    const entry = committerMap.get(author) ?? { commitCount: 0, branches: new Set<string>() };
    entry.commitCount += 1;
    for (const b of shaBranches) entry.branches.add(b);
    committerMap.set(author, entry);
    if (isSameUtcDay(date, now)) todayCommits += 1;
  }
  const committers = [...committerMap.entries()]
    .map(([author, v]) => ({ author, commitCount: v.commitCount, branches: [...v.branches] }))
    .sort((a, b) => b.commitCount - a.commitCount);

  const pullAuthorMap = new Map<string, { opened: number; merged: number }>();
  let pullsOpenedToday = 0;
  let pullsMergedToday = 0;
  for (const p of pulls) {
    const entry = pullAuthorMap.get(p.author) ?? { opened: 0, merged: 0 };
    entry.opened += 1;
    if (p.mergedAt) entry.merged += 1;
    pullAuthorMap.set(p.author, entry);
    if (isSameUtcDay(p.createdAt, now)) pullsOpenedToday += 1;
    if (p.mergedAt && isSameUtcDay(p.mergedAt, now)) pullsMergedToday += 1;
  }
  const byAuthor = [...pullAuthorMap.entries()]
    .map(([author, v]) => ({ author, ...v }))
    .sort((a, b) => b.opened - a.opened);

  return {
    generatedAt: new Date().toISOString(),
    owner,
    repo,
    branches: branches.sort((a, b) => b.commitCount - a.commitCount),
    committers,
    pulls: {
      opened: pulls.length,
      merged: pulls.filter((p) => p.mergedAt).length,
      byAuthor,
    },
    today: { commits: todayCommits, pullsOpened: pullsOpenedToday, pullsMerged: pullsMergedToday },
  };
}
