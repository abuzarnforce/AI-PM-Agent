import { NextResponse } from "next/server";
import { isJiraConfigured, isGeminiConfigured, getJiraConfig } from "@/lib/config";

export async function GET() {
  const jiraConfigured = isJiraConfigured();
  return NextResponse.json({
    jiraConfigured,
    geminiConfigured: isGeminiConfigured(),
    // Base URL only — never a secret, safe to expose so the UI can link straight to tickets.
    jiraBaseUrl: jiraConfigured ? getJiraConfig().baseUrl : null,
  });
}
