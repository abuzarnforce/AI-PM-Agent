import { NextResponse } from "next/server";
import { isJiraConfigured, isGeminiConfigured, getJiraConfig } from "@/lib/config";

export async function GET() {
  const jiraConfigured = await isJiraConfigured();
  return NextResponse.json({
    jiraConfigured,
    geminiConfigured: await isGeminiConfigured(),
    // Base URL only — never a secret, safe to expose so the UI can link straight to tickets.
    jiraBaseUrl: jiraConfigured ? (await getJiraConfig()).baseUrl : null,
  });
}
