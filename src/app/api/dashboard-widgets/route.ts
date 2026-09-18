import { NextRequest, NextResponse } from "next/server";
import { approximateCount } from "@/lib/jira";
import { isJiraConfigured } from "@/lib/config";

const ISSUE_TYPES = ["Bug", "Story", "Task", "Epic", "Feature", "Subtask", "Test case"];

/** Run counts with limited concurrency — firing a dozen+ requests at Jira at once
 * was tripping generic "fetch failed" network errors in some environments. */
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

export async function GET(req: NextRequest) {
  if (!isJiraConfigured()) {
    return NextResponse.json({ error: "Jira is not configured. Connect it from the Connector tab." }, { status: 400 });
  }

  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) {
    return NextResponse.json({ error: "projectKey is required" }, { status: 400 });
  }

  try {
    const scope = `project = "${projectKey}"`;

    const statusQueries = [
      { label: "To Do", jql: `${scope} AND statusCategory = "To Do"` },
      { label: "In Progress", jql: `${scope} AND statusCategory = "In Progress"` },
      { label: "Done", jql: `${scope} AND statusCategory = "Done"` },
    ];
    const extraQueries = [
      { key: "openBugs", jql: `${scope} AND issuetype = Bug AND statusCategory != Done` },
      { key: "createdLast30", jql: `${scope} AND created >= -30d` },
      { key: "resolvedLast30", jql: `${scope} AND statusCategory = Done AND updated >= -30d` },
    ];

    const statusCounts = await mapWithConcurrency(statusQueries, 1, async (q) => ({
      ...q,
      count: await approximateCount(q.jql),
    }));
    const extraCounts = await mapWithConcurrency(extraQueries, 1, async (q) => ({
      key: q.key,
      count: await approximateCount(q.jql),
    }));
    const issueTypeCounts = await mapWithConcurrency(ISSUE_TYPES, 1, async (type) => ({
      type,
      count: await approximateCount(`${scope} AND issuetype = "${type}"`).catch(() => 0),
    }));

    const extras = Object.fromEntries(extraCounts.map((e) => [e.key, e.count]));

    return NextResponse.json({
      projectKey,
      statusBreakdown: statusCounts,
      issueTypeBreakdown: issueTypeCounts.filter((t) => t.count > 0),
      openBugs: extras.openBugs,
      createdLast30: extras.createdLast30,
      resolvedLast30: extras.resolvedLast30,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
