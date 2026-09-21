import { NextRequest, NextResponse } from "next/server";
import { connectorStatus, saveConnectorConfig, clearConnector } from "@/lib/connectorStore";

export async function GET() {
  return NextResponse.json(await connectorStatus());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    jira?: { baseUrl?: string; email?: string; apiToken?: string };
    gemini?: { apiKey?: string; model?: string };
    github?: { repo?: string; token?: string };
  };

  const jira = body.jira
    ? {
        ...(body.jira.baseUrl ? { baseUrl: body.jira.baseUrl.replace(/\/+$/, "") } : {}),
        ...(body.jira.email ? { email: body.jira.email } : {}),
        ...(body.jira.apiToken ? { apiToken: body.jira.apiToken } : {}),
      }
    : undefined;

  const gemini = body.gemini
    ? {
        ...(body.gemini.apiKey ? { apiKey: body.gemini.apiKey } : {}),
        ...(body.gemini.model ? { model: body.gemini.model } : {}),
      }
    : undefined;

  const github = body.github
    ? {
        ...(body.github.repo ? { repo: body.github.repo.replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "") } : {}),
        ...(body.github.token ? { token: body.github.token } : {}),
      }
    : undefined;

  await saveConnectorConfig({ jira, gemini, github });
  return NextResponse.json(await connectorStatus());
}

export async function DELETE(req: NextRequest) {
  const { kind } = (await req.json()) as { kind: "jira" | "gemini" | "github" };
  if (kind !== "jira" && kind !== "gemini" && kind !== "github") {
    return NextResponse.json({ error: "kind must be 'jira', 'gemini', or 'github'" }, { status: 400 });
  }
  await clearConnector(kind);
  return NextResponse.json(await connectorStatus());
}
