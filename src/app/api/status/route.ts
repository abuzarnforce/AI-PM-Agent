import { NextResponse } from "next/server";
import { isJiraConfigured, isGeminiConfigured, isGithubConfigured, getJiraConfig } from "@/lib/config";

export async function GET() {
  const jiraConfigured = await isJiraConfigured();
  return NextResponse.json({
    jiraConfigured,
    geminiConfigured: await isGeminiConfigured(),
    githubConfigured: await isGithubConfigured(),
    // Base URL only — never a secret, safe to expose so the UI can link straight to tickets.
    jiraBaseUrl: jiraConfigured ? (await getJiraConfig()).baseUrl : null,
  });
}
