import { NextRequest, NextResponse } from "next/server";
import { getJiraConfig, isJiraConfigured, isGeminiConfigured, isGithubConfigured, getGithubConfig } from "@/lib/config";
import { generateText } from "@/lib/gemini";
import { testAccess } from "@/lib/github";

async function testJira(): Promise<{ ok: boolean; detail: string }> {
  if (!(await isJiraConfigured())) return { ok: false, detail: "Jira is not configured yet." };
  const { baseUrl, email, apiToken } = await getJiraConfig();
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
  if (!(await isGeminiConfigured())) return { ok: false, detail: "Gemini is not configured yet." };
  try {
    const text = await generateText('Reply with exactly one word: "pong".');
    return { ok: true, detail: `Model responded: ${text.trim().slice(0, 60)}` };
  } catch (err: any) {
    return { ok: false, detail: err.message ?? "Could not reach Gemini." };
  }
}

async function testGithub(): Promise<{ ok: boolean; detail: string }> {
  if (!(await isGithubConfigured())) return { ok: false, detail: "GitHub is not configured yet." };
  const { repo } = await getGithubConfig();
  const [owner, name] = repo.split("/");
  if (!owner || !name) return { ok: false, detail: `"${repo}" doesn't look like "owner/name".` };
  try {
    const { fullName, defaultBranch } = await testAccess(owner, name);
    return { ok: true, detail: `Connected to ${fullName} (default branch: ${defaultBranch})` };
  } catch (err: any) {
    return { ok: false, detail: err.message ?? "Could not reach GitHub." };
  }
}

export async function POST(req: NextRequest) {
  const { target } = (await req.json()) as { target: "jira" | "gemini" | "github" };
  if (target !== "jira" && target !== "gemini" && target !== "github") {
    return NextResponse.json({ error: "target must be 'jira', 'gemini', or 'github'" }, { status: 400 });
  }
  const result = target === "jira" ? await testJira() : target === "gemini" ? await testGemini() : await testGithub();
  return NextResponse.json(result);
}
