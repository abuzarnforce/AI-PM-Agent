"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, Plus, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import { useJiraBaseUrl, linkifyTicketKeys } from "@/lib/useJiraBaseUrl";
import { logActivity } from "@/lib/activity";
import type { Blocker, Confidence, FollowUp, TeamMember } from "@/lib/standup";
import { Badge, Button, EmptyState, ErrorState, Field, PageHeader, Section, SourceChip, Tabs, WorkingState, inputCls, type Tone } from "./ui";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const CONFIDENCE_TONE: Record<Confidence, Tone> = { on_track: "green", at_risk: "amber", blocked: "red" };
const CONFIDENCE_LABEL: Record<Confidence, string> = { on_track: "On Track", at_risk: "At Risk", blocked: "Blocked" };

interface StandupData {
  date: string;
  team: TeamMember[];
  updates: any[];
  followups: FollowUp[];
  blockers: Blocker[];
  jiraByMember: Record<string, any[]>;
  jiraError: string | null;
  kpis: { teamMembers: number; inProgress: number; completed: number; blocked: number; followUps: number; overdue: number; atRisk: number; present: number; absent: number };
}

export default function StandupPanel() {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<StandupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"team" | "followups" | "blockers">("team");
  const jiraBaseUrl = useJiraBaseUrl();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/standup?date=${date}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Standup"
        title="Daily Standup"
        description="Jira, team updates, blockers and follow-ups — everything you need before, during and after standup, in one place."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border bg-panel px-1 py-1">
            <button onClick={() => setDate((d) => shiftDate(d, -1))} className="btn flex h-7 w-7 items-center justify-center rounded text-muted hover:text-fg" aria-label="Previous day">
              <ChevronLeft size={15} />
            </button>
            <span className="tabular px-2 text-sm font-medium">{formatDate(date)}</span>
            <button onClick={() => setDate((d) => shiftDate(d, 1))} className="btn flex h-7 w-7 items-center justify-center rounded text-muted hover:text-fg" aria-label="Next day">
              <ChevronRight size={15} />
            </button>
            {date !== todayIso() && (
              <Button size="sm" variant="ghost" onClick={() => setDate(todayIso())}>
                Today
              </Button>
            )}
          </div>
        }
      >
        {data && (
          <Tabs
            id="standup-view"
            active={view}
            onChange={setView}
            tabs={[
              { id: "team", label: "Team" },
              { id: "followups", label: `Follow-ups${data.followups.length ? ` (${data.followups.length})` : ""}` },
              { id: "blockers", label: `Blockers${data.blockers.length ? ` (${data.blockers.length})` : ""}` },
            ]}
          />
        )}
      </PageHeader>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !data && <WorkingState steps={["Loading standup…", "Syncing Jira…"]} interval={900} />}

      {data && !loading && (
        <>
          {data.jiraError && (
            <div className="mb-6 rounded-md border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-[13px] text-amber-400">
              Jira sync unavailable — showing locally stored standup data only. ({data.jiraError})
            </div>
          )}

          <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-9">
            {[
              { label: "Team Members", value: data.kpis.teamMembers },
              { label: "Present", value: data.kpis.present },
              { label: "Absent", value: data.kpis.absent, tone: data.kpis.absent ? "amber" : undefined },
              { label: "In Progress", value: data.kpis.inProgress },
              { label: "Completed", value: data.kpis.completed },
              { label: "Blocked", value: data.kpis.blocked, tone: data.kpis.blocked ? "red" : undefined },
              { label: "Follow-ups", value: data.kpis.followUps },
              { label: "Overdue", value: data.kpis.overdue, tone: data.kpis.overdue ? "amber" : undefined },
              { label: "At Risk", value: data.kpis.atRisk, tone: data.kpis.atRisk ? "amber" : undefined },
            ].map((k) => (
              <div key={k.label}>
                <div className="text-[13px] text-muted">{k.label}</div>
                <div className={`tabular mt-1 text-2xl font-semibold ${k.tone === "red" ? "text-red-400" : k.tone === "amber" ? "text-amber-400" : ""}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <AiSummary date={date} data={data} />

          {view === "team" && <TeamView date={date} data={data} jiraBaseUrl={jiraBaseUrl} onReload={load} />}
          {view === "followups" && <FollowUpsView data={data} jiraBaseUrl={jiraBaseUrl} onReload={load} />}
          {view === "blockers" && <BlockersView data={data} jiraBaseUrl={jiraBaseUrl} onReload={load} />}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- AI Summary */

function AiSummary({ date, data }: { date: string; data: StandupData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/standup/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSummary(json.summary);
      logActivity("health", `Generated AI standup summary for ${date}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="AI Daily Summary" description="Based only on the data on this page — never invented." action={<Button size="sm" variant="primary" icon={Sparkles} loading={loading} onClick={run}>Generate AI Summary</Button>}>
      {error && <ErrorState message={error} onRetry={run} />}
      {!summary && !loading && !error && <p className="text-sm text-muted">Generate a summary once today's updates, blockers and follow-ups are in.</p>}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-lg border border-border bg-panel p-4">
          <p className="text-sm leading-relaxed">{summary.teamStatus}</p>
          {[
            { label: "Attention needed", items: summary.attentionNeeded },
            { label: "Delivery risk", items: summary.deliveryRisk },
            { label: "Carry-over", items: summary.carryOver },
            { label: "PM actions", items: summary.pmActions },
          ].map(
            (s) =>
              s.items?.length > 0 && (
                <div key={s.label}>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">{s.label}</div>
                  <ul className="mt-1 space-y-1">
                    {s.items.map((it: string, i: number) => (
                      <li key={i} className="text-sm leading-relaxed">
                        · {it}
                      </li>
                    ))}
                  </ul>
                </div>
              )
          )}
        </motion.div>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------- Team */

function TeamView({ date, data, jiraBaseUrl, onReload }: { date: string; data: StandupData; jiraBaseUrl: string | null; onReload: () => void }) {
  const [addingMember, setAddingMember] = useState(false);

  if (data.team.length === 0 && !addingMember) {
    return (
      <EmptyState
        icon={Users}
        title="No team members yet"
        description="Add the people on your team to start running daily standups."
        action={
          <Button variant="primary" icon={UserPlus} onClick={() => setAddingMember(true)}>
            Add team member
          </Button>
        }
      />
    );
  }

  const present = data.team.filter((m) => data.updates.find((u) => u.memberId === m.id)?.present !== false);
  const absent = data.team.filter((m) => data.updates.find((u) => u.memberId === m.id)?.present === false);

  return (
    <Section title="Today's Standup" action={<Button size="sm" icon={UserPlus} onClick={() => setAddingMember((v) => !v)}>Add member</Button>}>
      {addingMember && <AddMemberForm onDone={() => { setAddingMember(false); onReload(); }} />}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">Who's present today ({present.length})</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {present.map((m) => (
              <Badge key={m.id} tone="green">{m.name}</Badge>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-panel p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">Who's absent today ({absent.length})</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {absent.length === 0 ? (
              <span className="text-xs text-muted">No one — full team present</span>
            ) : (
              absent.map((m) => (
                <Badge key={m.id} tone="amber">{m.name}</Badge>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.team.map((member) => (
          <MemberCard
            key={member.id}
            date={date}
            member={member}
            update={data.updates.find((u) => u.memberId === member.id)}
            issues={data.jiraByMember[member.id] ?? []}
            jiraBaseUrl={jiraBaseUrl}
            onReload={onReload}
          />
        ))}
      </div>
    </Section>
  );
}

function AddMemberForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [jiraName, setJiraName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/standup/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, jiraDisplayName: jiraName || undefined }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel p-3">
      <Field label="Name" className="w-44">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Sarah Khan" />
      </Field>
      <Field label="Role" className="w-44">
        <input value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} placeholder="Product Engineer" />
      </Field>
      <Field label="Jira display name" hint="if different">
        <input value={jiraName} onChange={(e) => setJiraName(e.target.value)} className={inputCls} placeholder="Sarah Khan" />
      </Field>
      <Button variant="primary" loading={saving} onClick={submit} disabled={!name.trim()}>
        Save
      </Button>
    </div>
  );
}

function MemberCard({
  date,
  member,
  update,
  issues,
  jiraBaseUrl,
  onReload,
}: {
  date: string;
  member: TeamMember;
  update?: any;
  issues: any[];
  jiraBaseUrl: string | null;
  onReload: () => void;
}) {
  // "closed": card collapsed. "view": read-only saved update. "edit": editable form.
  const [mode, setMode] = useState<"closed" | "view" | "edit">(update ? "closed" : "edit");
  const [yesterday, setYesterday] = useState(update?.yesterday ?? "");
  const [today, setToday] = useState(update?.today ?? "");
  const [blockers, setBlockers] = useState(update?.blockers ?? "");
  const [confidence, setConfidence] = useState<Confidence>(update?.confidence ?? "on_track");
  const [saving, setSaving] = useState(false);
  const [present, setPresent] = useState(update?.present ?? true);
  const open = mode !== "closed";

  async function toggleAttendance() {
    const next = !present;
    setPresent(next);
    await fetch("/api/standup/updates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, memberId: member.id, present: next }),
    });
    onReload();
  }

  function startEdit() {
    setYesterday(update?.yesterday ?? "");
    setToday(update?.today ?? "");
    setBlockers(update?.blockers ?? "");
    setConfidence(update?.confidence ?? "on_track");
    setMode("edit");
  }

  async function save() {
    setSaving(true);
    await fetch("/api/standup/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, memberId: member.id, yesterday, today, blockers, confidence, present, relatedIssueKeys: issues.map((i) => i.key) }),
    });
    setSaving(false);
    setMode("view");
    onReload();
  }

  async function remove() {
    if (!confirm(`Remove ${member.name} from the team? Their past standup history is kept.`)) return;
    await fetch(`/api/standup/team?id=${member.id}`, { method: "DELETE" });
    onReload();
  }

  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <button
          onClick={() => setMode((m) => (m === "closed" ? (update ? "view" : "edit") : "closed"))}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg/10 text-[12px] font-semibold uppercase">{member.name.slice(0, 1)}</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{member.name}</div>
            {member.role && <div className="truncate text-xs text-muted">{member.role}</div>}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          {issues.length > 0 && <span className="text-xs text-subtle">{issues.length} Jira issue{issues.length === 1 ? "" : "s"}</span>}
          <button
            onClick={toggleAttendance}
            className={`btn rounded-md border px-2 py-0.5 text-[11px] font-medium ${present ? "border-border text-muted hover:text-fg" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}
          >
            {present ? "Present" : "Absent"}
          </button>
          {update && (
            <Badge tone={CONFIDENCE_TONE[update.confidence as Confidence]} dot>
              {CONFIDENCE_LABEL[update.confidence as Confidence]}
            </Badge>
          )}
          <button onClick={remove} className="btn text-muted hover:text-red-400" aria-label={`Remove ${member.name}`} title="Remove from team">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          {issues.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">Jira work</div>
              <div className="space-y-1.5">
                {issues.slice(0, 6).map((i) => (
                  <div key={i.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{linkifyTicketKeys(`${i.key}: ${i.summary}`, jiraBaseUrl)}</span>
                    <Badge tone={/done|closed|resolved/i.test(i.status) ? "green" : /blocked/i.test(i.status) ? "red" : "blue"}>{i.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === "view" && update ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Yesterday">
                  <p className="whitespace-pre-wrap text-sm">{update.yesterday || <span className="text-muted">—</span>}</p>
                </Field>
                <Field label="Today">
                  <p className="whitespace-pre-wrap text-sm">{update.today || <span className="text-muted">—</span>}</p>
                </Field>
              </div>
              <Field label="Blockers">
                <p className="whitespace-pre-wrap text-sm">{update.blockers || <span className="text-muted">—</span>}</p>
              </Field>
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">Saved</span>
                <Button size="sm" icon={Pencil} onClick={startEdit}>
                  Edit
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Yesterday">
                  <textarea value={yesterday} onChange={(e) => setYesterday(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="What did you complete yesterday?" />
                </Field>
                <Field label="Today">
                  <textarea value={today} onChange={(e) => setToday(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="What are you planning to work on today?" />
                </Field>
              </div>
              <Field label="Blockers">
                <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Are you blocked by anything?" />
              </Field>
              <Field label="Confidence">
                <div className="flex gap-2">
                  {(["on_track", "at_risk", "blocked"] as Confidence[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfidence(c)}
                      className={`btn rounded-md border px-2.5 py-1 text-xs font-medium ${confidence === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-fg"}`}
                    >
                      {CONFIDENCE_LABEL[c]}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex justify-end gap-2">
                {update && (
                  <Button size="sm" variant="ghost" onClick={() => setMode("view")}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" loading={saving} variant="primary" onClick={save}>
                  Save update
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Follow-ups */

function FollowUpsView({ data, jiraBaseUrl, onReload }: { data: StandupData; jiraBaseUrl: string | null; onReload: () => void }) {
  const [adding, setAdding] = useState(false);

  async function patch(id: string, body: Partial<FollowUp>) {
    await fetch("/api/standup/followups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    onReload();
  }
  async function remove(id: string) {
    await fetch(`/api/standup/followups?id=${id}`, { method: "DELETE" });
    onReload();
  }

  return (
    <Section title="Follow-ups" description="Work assigned by the PM that doesn't live in Jira." action={<Button size="sm" icon={Plus} onClick={() => setAdding((v) => !v)}>Add follow-up</Button>}>
      {adding && (
        <FollowUpForm
          team={data.team}
          onDone={() => {
            setAdding(false);
            onReload();
          }}
        />
      )}
      {data.followups.length === 0 ? (
        <EmptyState compact title="No outstanding follow-ups" />
      ) : (
        <ul className="divide-hairline border-y border-border">
          {data.followups.map((f) => {
            const owner = data.team.find((m) => m.id === f.ownerId);
            const overdue = !!f.dueDate && new Date(f.dueDate).getTime() < Date.now() && f.status !== "Completed";
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className={`min-w-0 flex-1 truncate ${f.status === "Completed" ? "text-muted line-through" : ""}`}>
                  {linkifyTicketKeys(f.title, jiraBaseUrl)}
                  {f.source === "ai" && <Badge tone="violet"> AI Suggested</Badge>}
                </span>
                <span className="text-xs text-muted">{owner?.name ?? "Unassigned"}</span>
                <span className={`tabular text-xs ${overdue ? "text-red-400" : "text-subtle"}`}>{f.dueDate ?? "no date"}</span>
                <Badge tone={f.priority === "Urgent" || f.priority === "High" ? "red" : f.priority === "Medium" ? "amber" : "neutral"}>{f.priority}</Badge>
                <select value={f.status} onChange={(e) => patch(f.id, { status: e.target.value as any })} className="rounded-md border border-border bg-panel px-1.5 py-1 text-xs">
                  {["Open", "In Progress", "Waiting", "Completed", "Cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button onClick={() => remove(f.id)} className="btn text-muted hover:text-red-400" aria-label="Delete follow-up">
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function FollowUpForm({ team, onDone }: { team: TeamMember[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [relatedJiraIssue, setRelatedJiraIssue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/standup/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, ownerId: ownerId || null, dueDate: dueDate || null, priority, relatedJiraIssue: relatedJiraIssue || null }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel p-3">
      <Field label="Title" className="w-56">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Follow up with DevOps for access" />
      </Field>
      <Field label="Assign to" className="w-40">
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
          <option value="">Unassigned</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Due date" className="w-36">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Priority" className="w-32">
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
          {["Low", "Medium", "High", "Urgent"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Related Jira" hint="optional" className="w-32">
        <input value={relatedJiraIssue} onChange={(e) => setRelatedJiraIssue(e.target.value)} className={inputCls} placeholder="PAY-241" />
      </Field>
      <Button variant="primary" loading={saving} onClick={submit} disabled={!title.trim()}>
        Save
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------- Blockers */

function BlockersView({ data, jiraBaseUrl, onReload }: { data: StandupData; jiraBaseUrl: string | null; onReload: () => void }) {
  const [adding, setAdding] = useState(false);

  async function patch(id: string, body: Partial<Blocker>) {
    await fetch("/api/standup/blockers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    onReload();
  }
  async function remove(id: string) {
    await fetch(`/api/standup/blockers?id=${id}`, { method: "DELETE" });
    onReload();
  }
  const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

  return (
    <Section title="Active Blockers" action={<Button size="sm" icon={Plus} onClick={() => setAdding((v) => !v)}>Add blocker</Button>}>
      {adding && (
        <BlockerForm
          team={data.team}
          onDone={() => {
            setAdding(false);
            onReload();
          }}
        />
      )}
      {data.blockers.length === 0 ? (
        <EmptyState compact title="No active blockers" />
      ) : (
        <div className="space-y-2">
          {data.blockers.map((b) => {
            const owner = data.team.find((m) => m.id === b.ownerId);
            const age = ageDays(b.reportedAt);
            const resolved = b.status === "Resolved" || b.status === "Closed";
            return (
              <div key={b.id} className={`rounded-lg border p-3 ${resolved ? "border-border opacity-60" : b.severity === "Critical" ? "border-red-500/30 bg-red-500/[0.04]" : "border-border bg-panel"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-sm font-medium">{linkifyTicketKeys(b.title, jiraBaseUrl)}</span>
                  <Badge tone={b.severity === "Critical" || b.severity === "High" ? "red" : b.severity === "Medium" ? "amber" : "neutral"}>{b.severity}</Badge>
                  {!resolved && age > 0 && <span className="tabular text-xs text-amber-400">Blocked {age}d</span>}
                  <select value={b.status} onChange={(e) => patch(b.id, { status: e.target.value as any })} className="rounded-md border border-border bg-panel px-1.5 py-1 text-xs">
                    {["New", "Acknowledged", "In Progress", "Resolved", "Closed"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => remove(b.id)} className="btn text-muted hover:text-red-400" aria-label="Delete blocker">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>Owner: {owner?.name ?? "Unassigned"}</span>
                  {b.relatedJiraIssue && <SourceChip kind="Jira" label={b.relatedJiraIssue} href={jiraBaseUrl ? `${jiraBaseUrl}/browse/${b.relatedJiraIssue}` : undefined} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function BlockerForm({ team, onDone }: { team: TeamMember[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [relatedJiraIssue, setRelatedJiraIssue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/standup/blockers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, ownerId: ownerId || null, severity, relatedJiraIssue: relatedJiraIssue || null }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel p-3">
      <Field label="Title" className="w-56">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Production credentials unavailable" />
      </Field>
      <Field label="Owner" className="w-40">
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
          <option value="">Unassigned</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Severity" className="w-32">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputCls}>
          {["Low", "Medium", "High", "Critical"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Related Jira" hint="optional" className="w-32">
        <input value={relatedJiraIssue} onChange={(e) => setRelatedJiraIssue(e.target.value)} className={inputCls} placeholder="PAY-241" />
      </Field>
      <Button variant="primary" loading={saving} onClick={submit} disabled={!title.trim()}>
        Save
      </Button>
    </div>
  );
}
