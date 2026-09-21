import { NextResponse } from "next/server";
import { isGithubConfigured, getGithubConfig } from "@/lib/config";
import { refreshSnapshot } from "@/lib/repoActivityStore";

export async function POST() {
  if (!(await isGithubConfigured())) {
    return NextResponse.json({ error: "GitHub is not configured. Connect it from the Connector tab." }, { status: 400 });
  }
  const { repo } = await getGithubConfig();
  try {
    const snapshot = await refreshSnapshot(repo);
    return NextResponse.json({ snapshot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
