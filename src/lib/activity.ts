"use client";

/** What PM Agent did in this browser: questions answered, checks run, drafts
 * decided. Kept per-viewer in localStorage (drafts themselves live server-side
 * and are merged into the timeline separately).
 * ponytail: browser-local log; move to the KV store if the team needs a shared audit trail. */

export type ActivityKind = "agent" | "health" | "studio" | "feedback" | "draft" | "qa" | "projects";

export interface ActivityEvent {
  at: string;
  kind: ActivityKind;
  text: string;
  detail?: string;
}

const KEY = "pm-agent-activity";
const MAX = 100;

export function readActivity(): ActivityEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function logActivity(kind: ActivityKind, text: string, detail?: string) {
  try {
    const next = [{ at: new Date().toISOString(), kind, text, detail }, ...readActivity()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

/** Last project key the PM looked at, so Home can show delivery numbers for it. */
export function getLastProject(): string {
  try {
    return localStorage.getItem("pm-agent-project") ?? "";
  } catch {
    return "";
  }
}
export function setLastProject(key: string) {
  try {
    localStorage.setItem("pm-agent-project", key);
  } catch {}
}
