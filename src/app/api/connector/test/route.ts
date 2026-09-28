import { NextRequest, NextResponse } from "next/server";
import { getJiraConfig, isJiraConfigured, isGeminiConfigured, getGeminiConfig, isGithubConfigured, getGithubConfig, isSlackConfigured } from "@/lib/config";
import { generateText } from "@/lib/gemini";
import { testAccess } from "@/lib/github";
import { testSlackAccess } from "@/lib/slack";

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
  if (!(await isGeminiConfigured())) return { ok: false, detail: "AI engine is not configured yet." };
  try {
    const config = await getGeminiConfig();
    const isNvidia = config.apiKey.startsWith("nvapi-");
    const engineName = isNvidia ? "NVIDIA NIM" : "Gemini";
    const text = await generateText('Reply with exactly one word: "pong".');
    return { ok: true, detail: `${engineName} responded: ${text.trim().slice(0, 60)}` };
  } catch (err: any) {
    return { ok: false, detail: err.message ?? "Could not reach AI provider." };
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

async function testSlack(): Promise<{ ok: boolean; detail: string }> {
  if (!(await isSlackConfigured())) return { ok: false, detail: "Slack is not configured yet." };
  try {
    const auth = await testSlackAccess();
    return { ok: true, detail: `Connected as @${auth.user} to workspace "${auth.team}" (${auth.url})` };
  } catch (err: any) {
    return { ok: false, detail: err.message ?? "Could not reach Slack." };
  }
}

export async function POST(req: NextRequest) {
  const { target } = (await req.json()) as { target: "jira" | "gemini" | "github" | "slack" };
  if (target !== "jira" && target !== "gemini" && target !== "github" && target !== "slack") {
    return NextResponse.json({ error: "target must be 'jira', 'gemini', 'github', or 'slack'" }, { status: 400 });
  }
  const result =
    target === "jira"
      ? await testJira()
      : target === "gemini"
      ? await testGemini()
      : target === "github"
      ? await testGithub()
      : await testSlack();
  return NextResponse.json(result);
}
