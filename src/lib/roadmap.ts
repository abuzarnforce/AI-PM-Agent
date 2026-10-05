import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "./kvStore";
import { isJiraConfigured } from "./config";
import { searchIssues, getIssue, type JiraIssue } from "./jira";
import { generateJson, generateText } from "./gemini";

/** PM-owned Product Roadmap Workspace. Two data layers:
 *  - CONNECTED: synced from Jira (read-only here — see `jiraLink` + `refreshJiraProgress`)
 *  - PM-OWNED: everything else on a RoadmapItem, created/edited only in this app.
 * PM-owned fields never write back to Jira; connecting to Jira never converts
 * the item into a raw Jira record (Hard Rule: roadmap stays a first-class entity). */

export type RoadmapItemType = "initiative" | "goal" | "epic" | "feature" | "milestone" | "idea" | "customer_request" | "release" | "note";
export type RoadmapSource = "jira" | "github" | "manual" | "ai";
export type RoadmapStatus = "idea" | "planned" | "in_progress" | "done" | "at_risk" | "blocked";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface Discussion {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  mention?: string;
  attachment?: string;
}

export interface Decision {
  id: string;
  decision: string;
  context: string;
  alternatives: string;
  owner: string;
  date: string;
  relatedJiraIssues: string[];
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  probability: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  severity: Severity;
  owner: string;
  mitigation: string;
  status: "Open" | "Mitigated" | "Closed";
}

export interface Dependency {
  id: string;
  description: string; // e.g. "AI Assistant depends on Customer API readiness"
  status: "Open" | "Resolved";
  source: "manual" | "jira";
}

export interface ActivityEvent {
  id: string;
  at: string;
  text: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  type: RoadmapItemType;
  source: RoadmapSource;
  status: RoadmapStatus;
  priority: Priority;
  owner: string;
  startDate: string | null;
  targetDate: string | null;
  progress: number; // 0-100
  progressMode: "manual" | "jira";
  storyPoints: number | null;
  estimatedEffort: string;
  businessImpact: "" | "Low" | "Medium" | "High" | "Critical";
  parentId: string | null;
  dependencies: Dependency[];
  goals: string[];
  successMetrics: string[];
  tags: string[];
  notes: string;
  discussions: Discussion[];
  decisions: Decision[];
  risks: Risk[];
  activity: ActivityEvent[];
  pmContext: {
    businessContext: string; // why are we building this
    customerProblem: string;
    strategicPriority: string; // why now
  };
  jiraLink: { key: string; url: string; status: string; issueType: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapSnapshot {
  id: string;
  label: string;
  createdAt: string;
  items: RoadmapItem[];
}

export interface AiRecommendation {
  summary: string;
  field: string;
  currentValue: string;
  recommendedValue: string;
  rationale: string;
}

const ITEMS_KEY = "roadmap:items";
const SNAPSHOTS_KEY = "roadmap:snapshots";

async function load(): Promise<RoadmapItem[]> {
  return (await readJson<RoadmapItem[]>(ITEMS_KEY)) ?? [];
}
async function save(items: RoadmapItem[]): Promise<void> {
  await writeJson(ITEMS_KEY, items);
}

function note(item: RoadmapItem, text: string) {
  item.activity.unshift({ id: randomUUID(), at: new Date().toISOString(), text });
}

/* -------------------------------------------------------------- CRUD */

export async function listItems(): Promise<RoadmapItem[]> {
  return (await load()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getItem(id: string): Promise<RoadmapItem | undefined> {
  return (await load()).find((i) => i.id === id);
}

export type NewRoadmapItemInput = Partial<
  Omit<RoadmapItem, "id" | "createdAt" | "updatedAt" | "activity" | "discussions" | "decisions" | "risks" | "dependencies" | "jiraLink" | "pmContext">
> & { title: string; type: RoadmapItemType; pmContext?: Partial<RoadmapItem["pmContext"]> };

export async function createItem(input: NewRoadmapItemInput): Promise<RoadmapItem> {
  const now = new Date().toISOString();
  const item: RoadmapItem = {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? "",
    type: input.type,
    source: input.source ?? "manual",
    status: input.status ?? "idea",
    priority: input.priority ?? "Medium",
    owner: input.owner ?? "",
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    progress: input.progress ?? 0,
    progressMode: "manual",
    storyPoints: null,
    estimatedEffort: input.estimatedEffort ?? "",
    businessImpact: input.businessImpact ?? "",
    parentId: input.parentId ?? null,
    dependencies: [],
    goals: input.goals ?? [],
    successMetrics: input.successMetrics ?? [],
    tags: input.tags ?? [],
    notes: input.notes ?? "",
    discussions: [],
    decisions: [],
    risks: [],
    activity: [],
    pmContext: {
      businessContext: input.pmContext?.businessContext ?? "",
      customerProblem: input.pmContext?.customerProblem ?? "",
      strategicPriority: input.pmContext?.strategicPriority ?? "",
    },
    jiraLink: null,
    createdAt: now,
    updatedAt: now,
  };
  note(item, `PM created "${item.title}" (${item.type.replace("_", " ")})`);
  const items = await load();
  items.push(item);
  await save(items);
  return item;
}

const TRACKED_FIELDS: { key: keyof RoadmapItem; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "targetDate", label: "Target date" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "businessImpact", label: "Business impact" },
];

/** Edits PM-owned fields only. Never touches Jira, even on a connected item. */
export async function updateItem(id: string, patch: Partial<RoadmapItem>): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);

  for (const { key, label } of TRACKED_FIELDS) {
    if (key in patch && patch[key] !== undefined && patch[key] !== item[key]) {
      note(item, `${label} changed from "${item[key] ?? "—"}" to "${patch[key] ?? "—"}"`);
    }
  }
  if ("progress" in patch && patch.progress !== undefined && patch.progress !== item.progress) {
    note(item, `Progress changed from ${item.progress}% to ${patch.progress}%`);
  }

  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  // Jira-connected items always report automatically-calculated progress.
  if (item.jiraLink) item.progressMode = "jira";
  await save(items);
  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const items = await load();
  await save(items.filter((i) => i.id !== id));
}

/* --------------------------------------------------------- Connect to Jira */

/** Free-text search over Jira for the "Connect to Jira" picker. */
export async function searchJiraForConnect(query: string): Promise<JiraIssue[]> {
  if (!query.trim()) return [];
  const isKey = /^[A-Z][A-Z0-9]+-\d+$/i.test(query.trim());
  const jql = isKey
    ? `key = "${query.trim().toUpperCase()}"`
    : `summary ~ "${query.replace(/"/g, '\\"')}" ORDER BY updated DESC`;
  return searchIssues(jql, 15);
}

export async function connectToJira(id: string, jiraKey: string): Promise<RoadmapItem> {
  const issue = await getIssue(jiraKey);
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  item.jiraLink = { key: issue.key, url: issue.url, status: issue.status, issueType: issue.issueType };
  item.progressMode = "jira";
  item.updatedAt = new Date().toISOString();
  note(item, `Connected Jira ${issue.issueType.toLowerCase()} ${issue.key}`);
  await save(items);
  await refreshJiraProgress(item.id);
  return item;
}

export async function disconnectJira(id: string): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  note(item, `Disconnected Jira ${item.jiraLink?.key ?? ""}`.trim());
  item.jiraLink = null;
  item.progressMode = "manual";
  item.updatedAt = new Date().toISOString();
  await save(items);
  return item;
}

/** Recomputes progress for a Jira-connected item from its children's story
 * points (falling back to plain issue completion when none are estimated),
 * and refreshes the cached execution status/type shown on the item. */
export async function refreshJiraProgress(id: string): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item || !item.jiraLink) return item!;

  const [epic, children] = await Promise.all([
    getIssue(item.jiraLink.key),
    searchIssues(`"Epic Link" = ${item.jiraLink.key} OR parent = ${item.jiraLink.key}`, 100).catch(() => [] as JiraIssue[]),
  ]);

  item.jiraLink = { key: epic.key, url: epic.url, status: epic.status, issueType: epic.issueType };

  const DONE = /done|closed|resolved/i;
  if (children.length === 0) {
    item.progress = DONE.test(epic.status) ? 100 : 0;
    item.storyPoints = null;
  } else {
    const pointed = children.filter((c) => c.storyPoints != null);
    if (pointed.length > 0) {
      const total = pointed.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
      const done = pointed.filter((c) => DONE.test(c.status)).reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
      item.progress = total > 0 ? Math.round((done / total) * 100) : 0;
      item.storyPoints = total;
    } else {
      const done = children.filter((c) => DONE.test(c.status)).length;
      item.progress = Math.round((done / children.length) * 100);
      item.storyPoints = null;
    }
  }
  item.progressMode = "jira";
  await save(items);
  return item;
}

/* --------------------------------------------------- Sub-entity mutations */

export async function addDiscussion(id: string, input: Omit<Discussion, "id" | "timestamp">): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  item.discussions.unshift({ id: randomUUID(), timestamp: new Date().toISOString(), ...input });
  note(item, `${input.author} added a discussion`);
  await save(items);
  return item;
}

export async function addDecision(id: string, input: Omit<Decision, "id">): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  item.decisions.unshift({ id: randomUUID(), ...input });
  note(item, `Decision recorded: "${input.decision}"`);
  await save(items);
  return item;
}

export async function addRisk(id: string, input: Omit<Risk, "id">): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  item.risks.unshift({ id: randomUUID(), ...input });
  note(item, `Risk added: "${input.title}" (${input.severity})`);
  await save(items);
  return item;
}

export async function updateRisk(id: string, riskId: string, patch: Partial<Risk>): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  const risk = item.risks.find((r) => r.id === riskId);
  if (!risk) throw new Error(`Risk ${riskId} not found`);
  Object.assign(risk, patch);
  await save(items);
  return item;
}

/** Adding this is always a PM-created relationship. If Jira later surfaces a
 * matching dependency, this list is where it's combined rather than duplicated;
 * for now every dependency recorded here is manual (Hard Rule: combine signals,
 * never silently duplicate — out of scope until Jira exposes issue links here). */
export async function addDependency(id: string, description: string): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  item.dependencies.unshift({ id: randomUUID(), description, status: "Open", source: "manual" });
  note(item, `Dependency added: "${description}"`);
  await save(items);
  return item;
}

export async function updateDependency(id: string, depId: string, patch: Partial<Dependency>): Promise<RoadmapItem> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Roadmap item ${id} not found`);
  const dep = item.dependencies.find((d) => d.id === depId);
  if (!dep) throw new Error(`Dependency ${depId} not found`);
  Object.assign(dep, patch);
  await save(items);
  return item;
}

/* ---------------------------------------------------------------- Snapshots */

async function loadSnapshots(): Promise<RoadmapSnapshot[]> {
  return (await readJson<RoadmapSnapshot[]>(SNAPSHOTS_KEY)) ?? [];
}

export async function listSnapshots(): Promise<RoadmapSnapshot[]> {
  return (await loadSnapshots()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createSnapshot(label: string): Promise<RoadmapSnapshot> {
  const snapshot: RoadmapSnapshot = { id: randomUUID(), label, createdAt: new Date().toISOString(), items: await load() };
  const snapshots = await loadSnapshots();
  snapshots.push(snapshot);
  await writeJson(SNAPSHOTS_KEY, snapshots);
  return snapshot;
}

/** What changed since a snapshot was taken — the "What changed since the last
 * roadmap snapshot?" question, computed directly rather than via AI. */
export function diffSnapshot(snapshot: RoadmapSnapshot, current: RoadmapItem[]): string[] {
  const changes: string[] = [];
  const before = new Map(snapshot.items.map((i) => [i.id, i]));
  const after = new Map(current.map((i) => [i.id, i]));
  for (const [id, item] of after) {
    const prior = before.get(id);
    if (!prior) {
      changes.push(`"${item.title}" was added to the roadmap`);
      continue;
    }
    if (prior.targetDate !== item.targetDate) changes.push(`"${item.title}" target date moved from ${prior.targetDate ?? "none"} to ${item.targetDate ?? "none"}`);
    if (prior.priority !== item.priority) changes.push(`"${item.title}" priority changed from ${prior.priority} to ${item.priority}`);
    if (prior.status !== item.status) changes.push(`"${item.title}" status changed from ${prior.status} to ${item.status}`);
    if (prior.progress !== item.progress) changes.push(`"${item.title}" progress moved from ${prior.progress}% to ${item.progress}%`);
  }
  for (const [id, item] of before) {
    if (!after.has(id)) changes.push(`"${item.title}" was removed from the roadmap`);
  }
  return changes;
}

/* ----------------------------------------------------------------------- AI */
/* AI recommends; it never silently writes. Every call here returns a
 * recommendation or an answer for the PM to Accept/Edit/Reject or read — see
 * Hard Rule 1 and the Drafts workflow for anything that *does* write to Jira. */

function describeItem(item: RoadmapItem): string {
  const lines = [
    `[SOURCE: PM] Roadmap item "${item.title}" (${item.type}, id ${item.id})`,
    `Status: ${item.status} · Priority: ${item.priority} · Progress: ${item.progress}% (${item.progressMode === "jira" ? "SOURCE: JIRA, auto-calculated" : "SOURCE: PM, manual"})`,
    `Target date: ${item.targetDate ?? "none"} · Business impact: ${item.businessImpact || "none"}`,
    item.pmContext.businessContext && `[SOURCE: PM] Business context: ${item.pmContext.businessContext}`,
    item.pmContext.customerProblem && `[SOURCE: PM] Customer problem: ${item.pmContext.customerProblem}`,
    item.pmContext.strategicPriority && `[SOURCE: PM] Strategic priority: ${item.pmContext.strategicPriority}`,
    item.successMetrics.length && `[SOURCE: PM] Success metrics: ${item.successMetrics.join("; ")}`,
    item.risks.length && `[SOURCE: PM] Risks: ${item.risks.map((r) => `${r.title} (${r.severity})`).join("; ")}`,
    item.dependencies.length && `[SOURCE: PM] Dependencies: ${item.dependencies.map((d) => d.description).join("; ")}`,
    item.decisions.length && `[SOURCE: PM] Decisions: ${item.decisions.map((d) => `${d.decision} — ${d.context}`).join("; ")}`,
    item.jiraLink && `[SOURCE: JIRA] Connected to ${item.jiraLink.key} (${item.jiraLink.status})`,
  ].filter(Boolean);
  return lines.join("\n");
}

const AI_SYSTEM = [
  "You are the AI layer inside a Product Manager's Roadmap Workspace.",
  "Context you receive is tagged by source: [SOURCE: JIRA] is execution data synced from Jira,",
  "[SOURCE: PM] is product context the PM entered directly, and anything you generate is SOURCE: AI.",
  "Never present an AI-generated recommendation as a fact, and never claim a roadmap change happened —",
  "you only ever recommend; the PM accepts, edits, or rejects.",
].join(" ");

export async function recommendForItem(item: RoadmapItem): Promise<AiRecommendation> {
  return generateJson<AiRecommendation>(
    `Given this roadmap item, recommend ONE concrete change (to priority, target date, sequencing, scope, or risk mitigation) that would most help it hit its goal. ` +
      `Return JSON: { "summary": string, "field": string, "currentValue": string, "recommendedValue": string, "rationale": string }.\n\n${describeItem(item)}`,
    AI_SYSTEM
  );
}

export async function askRoadmap(question: string, items: RoadmapItem[]): Promise<string> {
  const context = items.map(describeItem).join("\n\n");
  return generateText(
    `Answer the PM's question using ONLY the roadmap context below, citing each roadmap item by title and each Jira ` +
      `reference by key. If the data doesn't answer it, say so plainly instead of guessing.\n\nQuestion: ${question}\n\n${context || "(roadmap is empty)"}`,
    AI_SYSTEM
  );
}

export async function jiraEpicsNotOnRoadmap(items: RoadmapItem[]): Promise<JiraIssue[]> {
  if (!(await isJiraConfigured())) return [];
  const linkedKeys = new Set(items.map((i) => i.jiraLink?.key).filter(Boolean));
  const epics = await searchIssues(`issuetype = Epic AND statusCategory != Done ORDER BY updated DESC`, 50);
  return epics.filter((e) => !linkedKeys.has(e.key));
}
