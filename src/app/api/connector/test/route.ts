import { NextRequest, NextResponse } from "next/server";
import { getJiraConfig, isJiraConfigured, isGeminiConfigured } from "@/lib/config";
import { generateText } from "@/lib/gemini";

async function testJira(): Promise<{ ok: boolean; detail: string }> {
  if (!isJiraConfigured()) return { ok: false, detail: "Jira is not configured yet." };
  const { baseUrl, email, apiToken } = getJiraConfig();
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, detail: `Jira responded ${res.status}: ${text.slice(0, 200)}` };
    }
    const me = await res.json();
    return { ok: true, detail: `Connected as ${me.displayName ?? me.emailAddress ?? "unknown user"}` };
  } catch (err: any) {
    return { ok: false, detail: err.message ?? "Could not reach Jira." };
  }
}

async function testGemini(): Promise<{ ok: boolean; detail: string }> {
  if (!isGeminiConfigured()) return { ok: false, detail: "Gemini is not configured yet." };
  try {
    const text = await generateText('Reply with exactly one word: "pong".');
    return { ok: true, detail: `Model responded: ${text.trim().slice(0, 60)}` };
  } catch (err: any) {
    return { ok: false, detail: err.message ?? "Could not reach Gemini." };
  }
}

export async function POST(req: NextRequest) {
  const { target } = (await req.json()) as { target: "jira" | "gemini" };
  if (target !== "jira" && target !== "gemini") {
    return NextResponse.json({ error: "target must be 'jira' or 'gemini'" }, { status: 400 });
  }
  const result = target === "jira" ? await testJira() : await testGemini();
  return NextResponse.json(result);
}
