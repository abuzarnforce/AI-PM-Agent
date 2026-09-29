import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./kvStore";

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  jiraDisplayName?: string; // defaults to `name` if omitted
}

export type Confidence = "on_track" | "at_risk" | "blocked";

export interface StandupUpdate {
  id: string;
  date: string; // YYYY-MM-DD
  memberId: string;
  yesterday: string;
  today: string;
  blockers: string;
  confidence: Confidence;
  notes: string;
  relatedIssueKeys: string[];
  updatedAt: string;
}

export type FollowUpStatus = "Open" | "In Progress" | "Waiting" | "Completed" | "Cancelled";
export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface FollowUp {
  id: string;
  title: string;
  description: string;
  ownerId: string | null;
  createdBy: string;
  dueDate: string | null;
  priority: Priority;
  status: FollowUpStatus;
  relatedJiraIssue: string | null;
  tags: string[];
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type BlockerSeverity = "Low" | "Medium" | "High" | "Critical";
export type BlockerStatus = "New" | "Acknowledged" | "In Progress" | "Resolved" | "Closed";

export interface Blocker {
  id: string;
  title: string;
  description: string;
  ownerId: string | null;
  severity: BlockerSeverity;
  status: BlockerStatus;
  relatedJiraIssue: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  notes: string;
}

const TEAM_KEY = "standup:team";
const UPDATES_KEY = "standup:updates";
const FOLLOWUPS_KEY = "standup:followups";
const BLOCKERS_KEY = "standup:blockers";

async function load<T>(key: string): Promise<T[]> {
  return (await readJson<T[]>(key)) ?? [];
}
async function save<T>(key: string, items: T[]): Promise<void> {
  await writeJson(key, items);
}

/* ------------------------------------------------------------- Team */

export async function listTeam(): Promise<TeamMember[]> {
  return load<TeamMember>(TEAM_KEY);
}

export async function addTeamMember(input: Omit<TeamMember, "id">): Promise<TeamMember> {
  const team = await load<TeamMember>(TEAM_KEY);
  const member: TeamMember = { id: randomUUID(), ...input };
  team.push(member);
  await save(TEAM_KEY, team);
  return member;
}

export async function removeTeamMember(id: string): Promise<void> {
  const team = await load<TeamMember>(TEAM_KEY);
  await save(TEAM_KEY, team.filter((m) => m.id !== id));
}

/* ---------------------------------------------------------- Updates */

export async function listUpdates(date?: string): Promise<StandupUpdate[]> {
  const all = await load<StandupUpdate>(UPDATES_KEY);
  return date ? all.filter((u) => u.date === date) : all;
}

export async function upsertUpdate(
  input: Omit<StandupUpdate, "id" | "updatedAt">
): Promise<StandupUpdate> {
  const all = await load<StandupUpdate>(UPDATES_KEY);
  const existing = all.find((u) => u.date === input.date && u.memberId === input.memberId);
  const updatedAt = new Date().toISOString();
  if (existing) {
    Object.assign(existing, input, { updatedAt });
    await save(UPDATES_KEY, all);
    return existing;
  }
  const record: StandupUpdate = { id: randomUUID(), updatedAt, ...input };
  all.push(record);
  await save(UPDATES_KEY, all);
  return record;
}

/* -------------------------------------------------------- Follow-ups */

export async function listFollowUps(): Promise<FollowUp[]> {
  return (await load<FollowUp>(FOLLOWUPS_KEY)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createFollowUp(
  input: Omit<FollowUp, "id" | "createdAt" | "updatedAt" | "completedAt" | "status"> & { status?: FollowUpStatus }
): Promise<FollowUp> {
  const all = await load<FollowUp>(FOLLOWUPS_KEY);
  const now = new Date().toISOString();
  const record: FollowUp = { id: randomUUID(), createdAt: now, updatedAt: now, completedAt: null, status: input.status ?? "Open", ...input };
  all.push(record);
  await save(FOLLOWUPS_KEY, all);
  return record;
}

export async function updateFollowUp(id: string, patch: Partial<FollowUp>): Promise<FollowUp> {
  const all = await load<FollowUp>(FOLLOWUPS_KEY);
  const record = all.find((f) => f.id === id);
  if (!record) throw new Error(`Follow-up ${id} not found`);
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  if (patch.status === "Completed" && !record.completedAt) record.completedAt = new Date().toISOString();
  await save(FOLLOWUPS_KEY, all);
  return record;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const all = await load<FollowUp>(FOLLOWUPS_KEY);
  await save(FOLLOWUPS_KEY, all.filter((f) => f.id !== id));
}

/* ---------------------------------------------------------- Blockers */

export async function listBlockers(): Promise<Blocker[]> {
  return (await load<Blocker>(BLOCKERS_KEY)).sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1));
}

export async function createBlocker(
  input: Omit<Blocker, "id" | "reportedAt" | "resolvedAt" | "status"> & { status?: BlockerStatus }
): Promise<Blocker> {
  const all = await load<Blocker>(BLOCKERS_KEY);
  const record: Blocker = { id: randomUUID(), reportedAt: new Date().toISOString(), resolvedAt: null, status: input.status ?? "New", ...input };
  all.push(record);
  await save(BLOCKERS_KEY, all);
  return record;
}

export async function updateBlocker(id: string, patch: Partial<Blocker>): Promise<Blocker> {
  const all = await load<Blocker>(BLOCKERS_KEY);
  const record = all.find((b) => b.id === id);
  if (!record) throw new Error(`Blocker ${id} not found`);
  Object.assign(record, patch);
  if ((patch.status === "Resolved" || patch.status === "Closed") && !record.resolvedAt) {
    record.resolvedAt = new Date().toISOString();
  }
  await save(BLOCKERS_KEY, all);
  return record;
}

export async function deleteBlocker(id: string): Promise<void> {
  const all = await load<Blocker>(BLOCKERS_KEY);
  await save(BLOCKERS_KEY, all.filter((b) => b.id !== id));
}
