import { NextResponse } from "next/server";
import { isJiraConfigured, isGeminiConfigured, isGithubConfigured, isSlackConfigured, getJiraConfig, getGeminiConfig } from "@/lib/config";

export async function GET() {
  const jiraConfigured = await isJiraConfigured();
  const geminiConfig = await getGeminiConfig();
  const isNvidia = geminiConfig.apiKey.startsWith("nvapi-");
  return NextResponse.json({
    jiraConfigured,
    geminiConfigured: await isGeminiConfigured(),
    aiProvider: isNvidia ? "NVIDIA" : "Gemini",
    githubConfigured: await isGithubConfigured(),
    slackConfigured: await isSlackConfigured(),
    // Base URL only — never a secret, safe to expose so the UI can link straight to tickets.
    jiraBaseUrl: jiraConfigured ? (await getJiraConfig()).baseUrl : null,
  });
}
