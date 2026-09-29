import { NextRequest, NextResponse } from "next/server";
import { approximateCount, getStatusBreakdown, getVersions } from "@/lib/jira";
import { getJiraConfig, isJiraConfigured } from "@/lib/config";

/** Release status for one fixVersion (e.g. "MVP 2.0") — total issues and an exact
 * breakdown by status, for the Home screen's release widget. */
export async function GET(req: NextRequest) {
  if (!(await isJiraConfigured())) {
    return NextResponse.json({ error: "Jira is not configured. Connect it from the Connector tab." }, { status: 400 });
  }

  const projectKey = req.nextUrl.searchParams.get("projectKey");
  const versionQuery = req.nextUrl.searchParams.get("version") ?? "MVP 2.0";
  if (!projectKey) return NextResponse.json({ error: "projectKey is required" }, { status: 400 });

  try {
    const versions = await getVersions(projectKey);
    const version =
      versions.find((v) => v.name.toLowerCase() === versionQuery.toLowerCase()) ??
      versions.find((v) => v.name.toLowerCase().includes(versionQuery.toLowerCase()));

    if (!version) {
      return NextResponse.json({ found: false, projectKey, versionQuery, availableVersions: versions.map((v) => v.name) });
    }

    const jql = `project = "${projectKey}" AND fixVersion = "${version.name}"`;
    const [total, statusBreakdown, { baseUrl }] = await Promise.all([approximateCount(jql), getStatusBreakdown(jql), getJiraConfig()]);

    return NextResponse.json({
      found: true,
      projectKey,
      version: version.name,
      total,
      statusBreakdown,
      jiraUrl: `${baseUrl}/issues/?jql=${encodeURIComponent(jql)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
