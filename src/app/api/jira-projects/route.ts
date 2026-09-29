import { NextResponse } from "next/server";
import { getProjects } from "@/lib/jira";
import { isJiraConfigured } from "@/lib/config";

export async function GET() {
  if (!(await isJiraConfigured())) {
    return NextResponse.json({ error: "Jira is not configured." }, { status: 400 });
  }
  try {
    return NextResponse.json({ projects: await getProjects() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
