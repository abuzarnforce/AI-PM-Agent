import { NextRequest, NextResponse } from "next/server";
import { connectorStatus, saveConnectorConfig, clearConnector } from "@/lib/connectorStore";

export async function GET() {
  return NextResponse.json(connectorStatus());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    jira?: { baseUrl?: string; email?: string; apiToken?: string };
    gemini?: { apiKey?: string; model?: string };
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

  saveConnectorConfig({ jira, gemini });
  return NextResponse.json(connectorStatus());
}

export async function DELETE(req: NextRequest) {
  const { kind } = (await req.json()) as { kind: "jira" | "gemini" };
  if (kind !== "jira" && kind !== "gemini") {
    return NextResponse.json({ error: "kind must be 'jira' or 'gemini'" }, { status: 400 });
  }
  clearConnector(kind);
  return NextResponse.json(connectorStatus());
}
