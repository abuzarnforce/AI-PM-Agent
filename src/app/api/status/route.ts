import { NextResponse } from "next/server";
import { isJiraConfigured, isGeminiConfigured } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    jiraConfigured: isJiraConfigured(),
    geminiConfigured: isGeminiConfigured(),
  });
}
