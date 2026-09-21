import { NextResponse } from "next/server";
import { isGithubConfigured, getGithubConfig } from "@/lib/config";
import { getCachedSnapshot, refreshSnapshot } from "@/lib/repoActivityStore";

export async function GET() {
  if (!(await isGithubConfigured())) {
    return NextResponse.json({ error: "GitHub is not configured. Connect it from the Connector tab." }, { status: 400 });
  }
  const { repo } = await getGithubConfig();
  try {
    const cached = await getCachedSnapshot(repo);
    if (cached) return NextResponse.json({ snapshot: cached, cached: true });

    // No snapshot yet (first run before the daily cron has fired) — compute one live
    // so the tab isn't empty.
    const snapshot = await refreshSnapshot(repo);
    return NextResponse.json({ snapshot, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
