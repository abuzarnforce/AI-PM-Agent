"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  Link2,
  MessagesSquare,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
  Unlink,
} from "lucide-react";
import { useJiraBaseUrl } from "@/lib/useJiraBaseUrl";
import { logActivity } from "@/lib/activity";
import type {
  AiRecommendation,
  Decision,
  Dependency,
  Discussion,
  Priority,
  Risk,
  RoadmapItem,
  RoadmapItemType,
  RoadmapSnapshot,
  Severity,
} from "@/lib/roadmap";
import { Badge, Button, EmptyState, ErrorState, Field, PageHeader, Section, WorkingState, inputCls, type Tone } from "./ui";

const TYPE_LABEL: Record<RoadmapItemType, string> = {
  initiative: "Initiative",
  goal: "Goal",
  epic: "Epic",
  feature: "Feature",
  milestone: "Milestone",
  idea: "Idea",
  customer_request: "Customer Request",
  release: "Release",
  note: "Note",
};

const STATUS_LABEL: Record<RoadmapItem["status"], string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In Progress",
  at_risk: "At Risk",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_TONE: Record<RoadmapItem["status"], Tone> = {
  idea: "neutral",
  planned: "blue",
  in_progress: "violet",
  at_risk: "amber",
  blocked: "red",
  done: "green",
};

const PRIORITY_TONE: Record<Priority, Tone> = { Low: "neutral", Medium: "blue", High: "amber", Critical: "red" };
const SEVERITY_TONE: Record<Severity, Tone> = { Low: "neutral", Medium: "blue", High: "amber", Critical: "red" };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export default function RoadmapPanel() {
  const [items, setItems] = useState<RoadmapItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | RoadmapItem["status"]>("all");
  const jiraBaseUrl = useJiraBaseUrl();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await api("/api/roadmap");
      setItems(json.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem(type: RoadmapItemType) {
    const title = prompt(`Title for this ${TYPE_LABEL[type].toLowerCase()}?`);
    if (!title?.trim()) return;
    const json = await api("/api/roadmap", { method: "POST", body: JSON.stringify({ title: title.trim(), type }) });
    logActivity("projects", `Created roadmap ${TYPE_LABEL[type].toLowerCase()} "${title.trim()}"`);
    await load();
    setExpandedId(json.item.id);
  }

  async function removeItem(id: string, title: string) {
    if (!confirm(`Delete "${title}" from the roadmap? This can't be undone.`)) return;
    await api(`/api/roadmap/item?id=${id}`, { method: "DELETE" });
    await load();
  }

  const visible = (items ?? []).filter((i) => statusFilter === "all" || i.status === statusFilter);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Roadmap"
        title="Product Roadmap Workspace"
        description="Jira and GitHub give you execution data. Everything else here — goals, context, risks, decisions — is yours to own, and none of it writes back to Jira unless you connect an item and say so."
        actions={
          <>
            <SnapshotButton onSaved={load} />
            <AddMenu onPick={createItem} />
          </>
        }
      >
        {items && (
          <div className="flex flex-wrap gap-1.5">
            {(["all", "idea", "planned", "in_progress", "at_risk", "blocked", "done"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`btn rounded-md border px-2.5 py-1 text-xs font-medium ${
                  statusFilter === s ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-fg"
                }`}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </PageHeader>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !items && <WorkingState steps={["Loading roadmap…", "Syncing connected Jira items…"]} interval={900} />}

      {items && !loading && (
        <>
          <AskRoadmap />

          {visible.length === 0 ? (
            <EmptyState
              compact
              title={items.length === 0 ? "Your roadmap is empty" : "Nothing matches this filter"}
              description={items.length === 0 ? "Add an initiative, goal, or idea to start planning — no Jira connection required." : undefined}
            />
          ) : (
            <div className="space-y-3">
              {visible.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
                  onReload={load}
                  onDelete={() => removeItem(item.id, item.title)}
                  jiraBaseUrl={jiraBaseUrl}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- + Add menu */

const ADD_TYPES: RoadmapItemType[] = [
  "initiative",
  "goal",
  "epic",
  "feature",
  "milestone",
  "idea",
  "customer_request",
  "release",
  "note",
];

function AddMenu({ onPick }: { onPick: (type: RoadmapItemType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="primary" icon={Plus} onClick={() => setOpen((v) => !v)}>
        Add
        <ChevronDown size={14} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-border bg-panel py-1 shadow-lg">
          {ADD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setOpen(false);
                onPick(t);
              }}
              className="btn block w-full px-3 py-1.5 text-left text-sm hover:bg-fg/[0.05]"
            >
              Add {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Snapshots */

function SnapshotButton({ onSaved }: { onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<RoadmapSnapshot[]>([]);
  const [changes, setChanges] = useState<string[] | null>(null);

  async function save() {
    const label = prompt("Label this snapshot (e.g. \"Q4 Planning — October 5\")");
    if (!label?.trim()) return;
    setSaving(true);
    await api("/api/roadmap/snapshot", { method: "POST", body: JSON.stringify({ label: label.trim() }) });
    setSaving(false);
    logActivity("projects", `Saved roadmap snapshot "${label.trim()}"`);
    onSaved();
  }

  async function openPanel() {
    setOpen((v) => !v);
    if (!open) setSnapshots((await api("/api/roadmap/snapshot")).snapshots);
  }

  async function compare(id: string) {
    const json = await api(`/api/roadmap/snapshot?compare=${id}`);
    setChanges(json.changes);
  }

  return (
    <div className="relative">
      <Button icon={Camera} loading={saving} onClick={save}>
        Save Snapshot
      </Button>
      <button onClick={openPanel} className="btn ml-1 text-xs text-muted hover:text-fg">
        ({snapshots.length || "view"})
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-border bg-panel p-3 shadow-lg">
          <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">Snapshots</div>
          {snapshots.length === 0 ? (
            <p className="mt-2 text-xs text-muted">No snapshots saved yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{s.label}</span>
                  <button onClick={() => compare(s.id)} className="btn shrink-0 text-accent hover:underline">
                    What changed?
                  </button>
                </li>
              ))}
            </ul>
          )}
          {changes && (
            <div className="mt-2 border-t border-border pt-2">
              {changes.length === 0 ? (
                <p className="text-xs text-muted">No changes since this snapshot.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {changes.map((c, i) => (
                    <li key={i}>· {c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Ask the roadmap */

function AskRoadmap() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SUGGESTIONS = [
    "What are we building?",
    "Which customer requests are not yet mapped to Jira?",
    "Which roadmap items are likely to miss their target?",
    "What should we prioritize next?",
  ];

  async function ask(q: string) {
    setQuestion(q);
    setLoading(true);
    setError(null);
    try {
      const json = await api("/api/roadmap/ai", { method: "POST", body: JSON.stringify({ question: q }) });
      setAnswer(json.answer);
      logActivity("agent", `Asked the roadmap: "${q}"`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Ask the Roadmap" description="Answers pull only from connected Jira data and what PMs have entered here.">
      <div className="flex flex-wrap gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && question.trim() && ask(question)}
          className={`${inputCls} flex-1 min-w-[220px]`}
          placeholder="Why did we move this feature?"
        />
        <Button variant="primary" icon={Sparkles} loading={loading} disabled={!question.trim()} onClick={() => ask(question)}>
          Ask
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="btn rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-fg">
            {s}
          </button>
        ))}
      </div>
      {error && <div className="mt-3"><ErrorState message={error} /></div>}
      {answer && !loading && (
        <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-panel p-3 text-sm leading-relaxed">
          {answer}
        </motion.p>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------- Item card */

function ItemCard({
  item,
  expanded,
  onToggle,
  onReload,
  onDelete,
  jiraBaseUrl,
}: {
  item: RoadmapItem;
  expanded: boolean;
  onToggle: () => void;
  onReload: () => void;
  onDelete: () => void;
  jiraBaseUrl: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Badge tone="neutral">{TYPE_LABEL[item.type]}</Badge>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
        {item.jiraLink && (
          <a
            href={item.jiraLink.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-xs text-accent hover:underline"
          >
            {item.jiraLink.key}
          </a>
        )}
        <span className="tabular shrink-0 text-xs text-muted">{item.progress}%</span>
        <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
        <Badge tone={STATUS_TONE[item.status]} dot>
          {STATUS_LABEL[item.status]}
        </Badge>
        {item.risks.some((r) => r.status === "Open" && (r.severity === "High" || r.severity === "Critical")) && (
          <AlertTriangle size={14} className="shrink-0 text-red-400" aria-label="High-severity open risk" />
        )}
      </button>
      {expanded && <ItemDetail item={item} onReload={onReload} onDelete={onDelete} jiraBaseUrl={jiraBaseUrl} />}
    </div>
  );
}

/* ------------------------------------------------------------ Item detail */

function ItemDetail({
  item,
  onReload,
  onDelete,
  jiraBaseUrl,
}: {
  item: RoadmapItem;
  onReload: () => void;
  onDelete: () => void;
  jiraBaseUrl: string | null;
}) {
  async function patch(fields: Partial<RoadmapItem>) {
    await api("/api/roadmap/item", { method: "PATCH", body: JSON.stringify({ id: item.id, patch: fields }) });
    onReload();
  }

  return (
    <div className="space-y-6 border-t border-border px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Description">
          <textarea
            defaultValue={item.description}
            onBlur={(e) => e.target.value !== item.description && patch({ description: e.target.value })}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select defaultValue={item.status} onChange={(e) => patch({ status: e.target.value as RoadmapItem["status"] })} className={inputCls}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select defaultValue={item.priority} onChange={(e) => patch({ priority: e.target.value as Priority })} className={inputCls}>
              {(["Low", "Medium", "High", "Critical"] as Priority[]).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Target date">
            <input type="date" defaultValue={item.targetDate ?? ""} onChange={(e) => patch({ targetDate: e.target.value || null })} className={inputCls} />
          </Field>
          <Field label="Owner">
            <input
              defaultValue={item.owner}
              onBlur={(e) => e.target.value !== item.owner && patch({ owner: e.target.value })}
              className={inputCls}
              placeholder="Unassigned"
            />
          </Field>
        </div>
      </div>

      <ProgressBlock item={item} onPatch={patch} onReload={onReload} />
      <ConnectJiraBlock item={item} onReload={onReload} jiraBaseUrl={jiraBaseUrl} />
      <PmContextBlock item={item} onPatch={patch} />
      <RecommendationBlock item={item} onReload={onReload} onPatch={patch} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RisksBlock item={item} onReload={onReload} />
        <DependenciesBlock item={item} onReload={onReload} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DecisionsBlock item={item} onReload={onReload} />
        <DiscussionsBlock item={item} onReload={onReload} />
      </div>

      <ActivityBlock item={item} />

      <div className="flex justify-end border-t border-border pt-3">
        <Button size="sm" variant="danger" icon={Trash2} onClick={onDelete}>
          Delete item
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Progress */

function ProgressBlock({ item, onPatch, onReload }: { item: RoadmapItem; onPatch: (f: Partial<RoadmapItem>) => void; onReload: () => void }) {
  const [value, setValue] = useState(item.progress);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium text-fg/80">Progress</span>
        <span className="text-xs text-subtle">
          {item.progressMode === "jira" ? "Automatically calculated from Jira" : "Manually set — not connected to Jira"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-fg/10">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${item.progress}%` }} />
        </div>
        <span className="tabular w-10 shrink-0 text-right text-sm">{item.progress}%</span>
      </div>
      {item.progressMode === "manual" && (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onMouseUp={() => onPatch({ progress: value })}
            onTouchEnd={() => onPatch({ progress: value })}
            className="flex-1"
          />
        </div>
      )}
      {item.storyPoints != null && <div className="mt-1 text-xs text-subtle">{item.storyPoints} story points tracked</div>}
    </div>
  );
}

/* ------------------------------------------------------- Connect to Jira */

function ConnectJiraBlock({ item, onReload, jiraBaseUrl }: { item: RoadmapItem; onReload: () => void; jiraBaseUrl: string | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ key: string; summary: string; status: string; issueType: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim()) return setResults([]);
    setSearching(true);
    try {
      const json = await api(`/api/roadmap/connect?q=${encodeURIComponent(q)}`);
      setResults(json.issues);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function connect(key: string) {
    setError(null);
    try {
      await api("/api/roadmap/connect", { method: "POST", body: JSON.stringify({ id: item.id, jiraKey: key }) });
      logActivity("projects", `Connected roadmap item "${item.title}" to Jira ${key}`);
      setResults([]);
      setQuery("");
      onReload();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function disconnect() {
    await api("/api/roadmap/connect", { method: "POST", body: JSON.stringify({ id: item.id, disconnect: true }) });
    onReload();
  }

  if (item.jiraLink) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Link2 size={14} className="text-accent" />
          Connected to{" "}
          <a href={item.jiraLink.url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
            {item.jiraLink.key}
          </a>
          <Badge tone="neutral">{item.jiraLink.status}</Badge>
        </div>
        <Button size="sm" icon={Unlink} onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Field label="Connect to Jira" hint="search by key or summary">
      {error && <ErrorState message={error} />}
      <input value={query} onChange={(e) => search(e.target.value)} className={inputCls} placeholder="BILL-142 or “billing assistant”" />
      {searching && <p className="mt-1 text-xs text-muted">Searching…</p>}
      {results.length > 0 && (
        <ul className="mt-1.5 divide-hairline overflow-hidden rounded-md border border-border">
          {results.map((r) => (
            <li key={r.key}>
              <button onClick={() => connect(r.key)} className="btn flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-fg/[0.05]">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{r.key}</span> — {r.summary}
                </span>
                <Badge tone="neutral">{r.status}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

/* ------------------------------------------------------------- PM context */

function PmContextBlock({ item, onPatch }: { item: RoadmapItem; onPatch: (f: Partial<RoadmapItem>) => void }) {
  const [ctx, setCtx] = useState(item.pmContext);
  const [metrics, setMetrics] = useState(item.successMetrics.join(", "));
  const [impact, setImpact] = useState(item.businessImpact);

  function save(patch: Partial<typeof ctx>) {
    const next = { ...ctx, ...patch };
    setCtx(next);
    onPatch({ pmContext: next } as Partial<RoadmapItem>);
  }

  return (
    <Section title="PM Context" description="Why this exists and why it matters — never pulled from Jira.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business context" hint="why are we building this">
          <textarea defaultValue={ctx.businessContext} onBlur={(e) => save({ businessContext: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Customer problem">
          <textarea defaultValue={ctx.customerProblem} onBlur={(e) => save({ customerProblem: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Strategic priority" hint="why now">
          <textarea defaultValue={ctx.strategicPriority} onBlur={(e) => save({ strategicPriority: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Business impact">
          <select value={impact} onChange={(e) => { setImpact(e.target.value as any); onPatch({ businessImpact: e.target.value as any }); }} className={inputCls}>
            <option value="">Not set</option>
            {["Low", "Medium", "High", "Critical"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Success metrics" hint="comma-separated" className="sm:col-span-2">
          <input
            value={metrics}
            onChange={(e) => setMetrics(e.target.value)}
            onBlur={() => onPatch({ successMetrics: metrics.split(",").map((s) => s.trim()).filter(Boolean) })}
            className={inputCls}
            placeholder="Activation rate +10%, support tickets -20%"
          />
        </Field>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- AI recommendation */

function RecommendationBlock({ item, onReload, onPatch }: { item: RoadmapItem; onReload: () => void; onPatch: (f: Partial<RoadmapItem>) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<AiRecommendation | null>(null);
  const [editValue, setEditValue] = useState("");

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const json = await api("/api/roadmap/ai", { method: "POST", body: JSON.stringify({ mode: "recommend", itemId: item.id }) });
      setRec(json.recommendation);
      setEditValue(json.recommendation.recommendedValue);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function accept(value: string) {
    const fieldMap: Record<string, keyof RoadmapItem> = { priority: "priority", status: "status", targetDate: "targetDate", notes: "notes" };
    const key = fieldMap[rec!.field.toLowerCase()] ?? "notes";
    onPatch({ [key]: value } as Partial<RoadmapItem>);
    logActivity("projects", `Accepted AI recommendation for "${item.title}": ${rec!.summary}`);
    setRec(null);
  }

  return (
    <Section title="AI Recommendation" description="A suggestion only — it never changes the roadmap until you accept it." action={<Button size="sm" icon={Sparkles} loading={loading} onClick={run}>Ask AI</Button>}>
      {error && <ErrorState message={error} />}
      {rec && (
        <div className="space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/[0.04] p-3">
          <Badge tone="violet">AI Recommendation</Badge>
          <p className="text-sm font-medium">{rec.summary}</p>
          <p className="text-sm text-muted">{rec.rationale}</p>
          <div className="flex items-center gap-2 text-xs text-subtle">
            <span>{rec.field}:</span>
            <span className="line-through">{rec.currentValue}</span>
            <span>→</span>
            <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="rounded border border-border bg-panel px-1.5 py-0.5" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => accept(editValue)}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRec(null)}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

/* ----------------------------------------------------------------- Risks */

function RisksBlock({ item, onReload }: { item: RoadmapItem; onReload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [mitigation, setMitigation] = useState("");

  async function submit() {
    if (!title.trim()) return;
    await api("/api/roadmap/item", {
      method: "PATCH",
      body: JSON.stringify({
        id: item.id,
        action: "risk",
        risk: { title: title.trim(), description: "", probability: "Medium", impact: severity, severity, owner: "", mitigation, status: "Open" },
      }),
    });
    setTitle("");
    setMitigation("");
    setAdding(false);
    onReload();
  }

  async function resolve(riskId: string) {
    await api("/api/roadmap/item", { method: "PATCH", body: JSON.stringify({ id: item.id, action: "risk_update", riskId, patch: { status: "Mitigated" } }) });
    onReload();
  }

  return (
    <Section title={`Risks (${item.risks.length})`} action={<Button size="sm" icon={Plus} onClick={() => setAdding((v) => !v)}>Add risk</Button>}>
      {adding && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-bg p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Billing API dependency" />
          <div className="flex gap-2">
            {(["Low", "Medium", "High", "Critical"] as Severity[]).map((s) => (
              <button key={s} onClick={() => setSeverity(s)} className={`btn rounded-md border px-2 py-1 text-xs ${severity === s ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <input value={mitigation} onChange={(e) => setMitigation(e.target.value)} className={inputCls} placeholder="Mitigation (optional)" />
          <Button size="sm" variant="primary" onClick={submit} disabled={!title.trim()}>
            Save
          </Button>
        </div>
      )}
      {item.risks.length === 0 ? (
        <p className="text-xs text-muted">No risks recorded.</p>
      ) : (
        <ul className="space-y-1.5">
          {item.risks.map((r: Risk) => (
            <li key={r.id} className={`rounded-md border p-2 text-xs ${r.status === "Open" ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.title}</span>
                <Badge tone={SEVERITY_TONE[r.severity]}>{r.severity}</Badge>
              </div>
              {r.mitigation && <p className="mt-0.5 text-muted">Mitigation: {r.mitigation}</p>}
              {r.status === "Open" && (
                <button onClick={() => resolve(r.id)} className="btn mt-1 text-accent hover:underline">
                  Mark mitigated
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ----------------------------------------------------------- Dependencies */

function DependenciesBlock({ item, onReload }: { item: RoadmapItem; onReload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");

  async function submit() {
    if (!description.trim()) return;
    await api("/api/roadmap/item", { method: "PATCH", body: JSON.stringify({ id: item.id, action: "dependency", description: description.trim() }) });
    setDescription("");
    setAdding(false);
    onReload();
  }

  async function toggle(dep: Dependency) {
    await api("/api/roadmap/item", {
      method: "PATCH",
      body: JSON.stringify({ id: item.id, action: "dependency_update", depId: dep.id, patch: { status: dep.status === "Open" ? "Resolved" : "Open" } }),
    });
    onReload();
  }

  return (
    <Section title={`Dependencies (${item.dependencies.length})`} action={<Button size="sm" icon={Plus} onClick={() => setAdding((v) => !v)}>Add dependency</Button>}>
      {adding && (
        <div className="mb-3 flex gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={inputCls}
            placeholder="Depends on Customer API readiness"
          />
          <Button size="sm" variant="primary" onClick={submit} disabled={!description.trim()}>
            Save
          </Button>
        </div>
      )}
      {item.dependencies.length === 0 ? (
        <p className="text-xs text-muted">No dependencies recorded.</p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {item.dependencies.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
              <span className={d.status === "Resolved" ? "text-muted line-through" : ""}>{d.description}</span>
              <button onClick={() => toggle(d)} className="btn shrink-0 text-accent hover:underline">
                {d.status === "Open" ? "Mark resolved" : "Reopen"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* --------------------------------------------------------------- Decisions */

function DecisionsBlock({ item, onReload }: { item: RoadmapItem; onReload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [decision, setDecision] = useState("");
  const [context, setContext] = useState("");
  const [owner, setOwner] = useState("");

  async function submit() {
    if (!decision.trim()) return;
    await api("/api/roadmap/item", {
      method: "PATCH",
      body: JSON.stringify({
        id: item.id,
        action: "decision",
        decision: { decision: decision.trim(), context, alternatives: "", owner, date: new Date().toISOString().slice(0, 10), relatedJiraIssues: [] },
      }),
    });
    setDecision("");
    setContext("");
    setOwner("");
    setAdding(false);
    onReload();
  }

  return (
    <Section title={`Decisions (${item.decisions.length})`} action={<Button size="sm" icon={ScrollText} onClick={() => setAdding((v) => !v)}>Record decision</Button>}>
      {adding && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-bg p-3">
          <input value={decision} onChange={(e) => setDecision(e.target.value)} className={inputCls} placeholder="Move Payments to Q1" />
          <input value={context} onChange={(e) => setContext(e.target.value)} className={inputCls} placeholder="Why — e.g. API dependency makes December high risk" />
          <input value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls} placeholder="Decision owner" />
          <Button size="sm" variant="primary" onClick={submit} disabled={!decision.trim()}>
            Save
          </Button>
        </div>
      )}
      {item.decisions.length === 0 ? (
        <p className="text-xs text-muted">No decisions recorded.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {item.decisions.map((d: Decision) => (
            <li key={d.id} className="rounded-md border border-border p-2">
              <div className="font-medium">{d.decision}</div>
              {d.context && <div className="mt-0.5 text-muted">{d.context}</div>}
              <div className="mt-1 text-subtle">{d.owner || "Unowned"} · {d.date}</div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------- Discussions */

function DiscussionsBlock({ item, onReload }: { item: RoadmapItem; onReload: () => void }) {
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("PM");

  async function submit() {
    if (!message.trim()) return;
    await api("/api/roadmap/item", {
      method: "PATCH",
      body: JSON.stringify({ id: item.id, action: "discussion", discussion: { author, message: message.trim() } }),
    });
    setMessage("");
    onReload();
  }

  return (
    <Section title={`Discussions (${item.discussions.length})`}>
      <div className="mb-3 flex gap-2">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} className={`${inputCls} w-28 shrink-0`} placeholder="Name" />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className={inputCls}
          placeholder="Engineering believes the API dependency will need another sprint"
        />
        <Button size="sm" icon={MessagesSquare} onClick={submit} disabled={!message.trim()}>
          Post
        </Button>
      </div>
      {item.discussions.length === 0 ? (
        <p className="text-xs text-muted">No discussion yet.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {item.discussions.map((d: Discussion) => (
            <li key={d.id} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.author}</span>
                <span className="text-subtle">{new Date(d.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-0.5">{d.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ----------------------------------------------------------------- Activity */

function ActivityBlock({ item }: { item: RoadmapItem }) {
  return (
    <Section title="Activity">
      {item.activity.length === 0 ? (
        <p className="text-xs text-muted">Nothing logged yet.</p>
      ) : (
        <ol className="space-y-1.5 border-l border-border pl-3 text-xs">
          {item.activity.slice(0, 20).map((a) => (
            <li key={a.id}>
              <span className="text-subtle">{new Date(a.at).toLocaleDateString()}</span> — {a.text}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
