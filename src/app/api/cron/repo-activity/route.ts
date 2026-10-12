import { NextRequest, NextResponse } from "next/server";
import { isGithubConfigured, getGithubConfig } from "@/lib/config";
import { refreshSnapshot } from "@/lib/repoActivityStore";
import { MAIN_WORKSPACE, runInWorkspace } from "@/lib/kvStore";

/** Vercel Cron's standard auth convention: it calls this route with
 * `Authorization: Bearer ${CRON_SECRET}` when that env var is set on the project.
 * Reject anything else so this endpoint can't be triggered by an outside request. */
export async function GET(req: NextRequest) {
  // No signed-in user here; the daily refresh is for the main workspace only.
  return runInWorkspace(MAIN_WORKSPACE, () => refresh(req));
}

async function refresh(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isGithubConfigured())) {
    return NextResponse.json({ skipped: true, reason: "GitHub is not configured." });
  }

  const { repo } = await getGithubConfig();
  try {
    const snapshot = await refreshSnapshot(repo);
    return NextResponse.json({ ok: true, generatedAt: snapshot.generatedAt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
