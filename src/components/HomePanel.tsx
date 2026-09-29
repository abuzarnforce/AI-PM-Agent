"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, Bug, FlaskConical, Inbox, Cable } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNav } from "@/lib/nav";
import { getLastProject, readActivity, type ActivityEvent } from "@/lib/activity";
import { Badge, Button, FadeIn, Metric, Section, Skeleton, SourceChip, relativeTime, type Tone } from "./ui";
import IntelligenceLayer from "./IntelligenceLayer";

interface Draft {
  id: string;
  kind: string;
  status: string;
  title: string;
  createdAt: string;
  result?: { key: string; url: string };
}

interface Signal {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: string;
  items?: string[];
  sources: { kind: string; label: string }[];
  actions: { label: string; run: () => void; primary?: boolean }[];
}

export const SUGGESTED_PROMPTS = [
  "What's blocking this sprint?",
  "Summarize this week's progress.",
  "What changed since Monday?",
  "Which bugs are still open and high priority?",
  "Find possible duplicate stories.",
  "Prepare my stakeholder update.",
];

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePanel() {
  const { navigate } = useNav();
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [qa, setQa] = useState<any>(undefined);
  const [repo, setRepo] = useState<any>(undefined);
  const [project, setProject] = useState<any>(undefined);
  const [release, setRelease] = useState<any>(undefined);
  const [projectKey, setProjectKey] = useState("");
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [ask, setAsk] = useState("");
  const [now, setNow] = useState<Date | null>(null); // client-only, avoids SSR timezone mismatch

  useEffect(() => {
    const key = getLastProject();
    setNow(new Date());
    setProjectKey(key);
    setActivity(readActivity().slice(0, 5));
    const json = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    json("/api/auth/me").then((d) => setUsername(d?.username ?? null));
    json("/api/drafts").then((d) => setDrafts(d?.drafts ?? []));
    json("/api/qa-sheet").then((d) => setQa(d?.snapshot ?? null));
    json("/api/status").then((s) => {
      setStatus(s);
      if (s?.githubConfigured) json("/api/repo-activity").then((d) => setRepo(d?.snapshot ?? null));
      else setRepo(null);
      if (s?.jiraConfigured && key) {
        json(`/api/dashboard-widgets?projectKey=${encodeURIComponent(key)}`).then(setProject);
        json(`/api/release-status?projectKey=${encodeURIComponent(key)}&version=${encodeURIComponent("MVP 2.0")}`).then(setRelease);
      } else {
        setProject(null);
        setRelease(null);
      }
    });
  }, []);

  const pending = drafts?.filter((d) => !d.result && (d.status === "needs triage" || d.status === "ready for grooming")) ?? [];
  const reg = qa?.regression;
  const executed = reg ? reg.pass + reg.fail + reg.blocked : 0;
  const passRate = reg && executed ? Math.round((reg.pass / executed) * 100) : null;
  const statusTotal = project?.statusBreakdown?.reduce((s: number, b: any) => s + b.count, 0) ?? 0;
  const done = project?.statusBreakdown?.find((b: any) => b.label === "Done")?.count ?? 0;
  const inProgress = project?.statusBreakdown?.find((b: any) => b.label === "In Progress")?.count ?? 0;
  const deliveryPct = statusTotal ? Math.round((done / statusTotal) * 100) : null;
  const loadingAny = drafts === null || qa === undefined || status === null;

  const signals: Signal[] = [];
  if (reg && reg.fail + reg.blocked > 0) {
    signals.push({
      id: "qa",
      icon: FlaskConical,
      tone: "red",
      title: `${reg.fail + reg.blocked} regression scenario${reg.fail + reg.blocked === 1 ? " is" : "s are"} failing or blocked`,
      body: `${reg.fail} failing and ${reg.blocked} blocked out of ${reg.total}. ${reg.notExecuted} haven't been run yet.`,
      items: reg.failingOrBlocked.slice(0, 3).map((f: any) => `${f.feature} — ${f.scenario} (${f.result})`),
      sources: [{ kind: "QA sheet", label: qa.sourceFileName }],
      actions: [
        { label: "Review QA", run: () => navigate("health", { subtab: "qa" }), primary: true },
        { label: "Ask PM Agent", run: () => navigate("agent", { question: "Which open bugs are most likely to block the release?" }) },
      ],
    });
  }
  if (project && project.createdLast30 > project.resolvedLast30) {
    signals.push({
      id: "bugs",
      icon: Bug,
      tone: "amber",
      title: `${project.projectKey}: new work is outpacing resolution`,
      body: `${project.createdLast30} issues created vs ${project.resolvedLast30} resolved in the last 30 days, with ${project.openBugs} open bug${project.openBugs === 1 ? "" : "s"}.`,
      sources: [{ kind: "Jira", label: `project ${project.projectKey}` }],
      actions: [
        { label: "Open project", run: () => navigate("projects"), primary: true },
        { label: "Ask PM Agent", run: () => navigate("agent", { question: `What's driving the growth in open issues in ${project.projectKey}?` }) },
      ],
    });
  }
  if (pending.length > 0) {
    signals.push({
      id: "drafts",
      icon: Inbox,
      tone: "blue",
      title: `${pending.length} draft${pending.length === 1 ? " is" : "s are"} waiting for your review`,
      body: "Nothing is written to Jira until you approve it.",
      items: pending.slice(0, 3).map((d) => d.title),
      sources: [{ kind: "Drafts", label: `${pending.length} pending` }],
      actions: [{ label: "Review drafts", run: () => navigate("drafts"), primary: true }],
    });
  }

  const notConnected = status && (!status.jiraConfigured || !status.geminiConfigured);

  return (
    <div className="page">
      <FadeIn>
        <div className="eyebrow mb-4 h-3">{now?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 className="text-display">
          {now ? greeting(now) : "Welcome"}
          {username ? `, ${username}` : ""}.
        </h1>
        <p className="mt-3 text-lg text-muted">Here's what's happening across your product.</p>
      </FadeIn>

      {notConnected && (
        <FadeIn delay={0.05} className="mt-10 rounded-xl border border-border bg-panel p-6 sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Connect your tools to start understanding your product.</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                PM Agent reads Jira, your QA sheet and GitHub, then turns them into insight you can act on — with every
                change to Jira waiting for your approval.
              </p>
              <Button variant="primary" icon={Cable} className="mt-5" onClick={() => navigate("connections")}>
                Connect Jira
              </Button>
            </div>
            <IntelligenceLayer
              live={{ Jira: status.jiraConfigured, GitHub: status.githubConfigured, QA: !!qa, Feedback: status.geminiConfigured, Analytics: false }}
            />
          </div>
        </FadeIn>
      )}

      {/* Snapshot */}
      <FadeIn delay={0.08} className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-8 lg:grid-cols-4">
        {loadingAny ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : (
          <>
            {deliveryPct != null ? (
              <Metric
                label="Delivery"
                value={`${deliveryPct}%`}
                caption={`${inProgress} in progress`}
                tone={deliveryPct >= 60 ? "green" : deliveryPct >= 30 ? "amber" : "neutral"}
                source={`Jira · ${project.projectKey} · share of issues done`}
              />
            ) : (
              <EmptyMetric label="Delivery" cta={projectKey ? "Couldn't load project" : "Choose a project"} onClick={() => navigate("projects")} />
            )}
            {passRate != null ? (
              <Metric
                label="QA pass rate"
                value={`${passRate}%`}
                caption={passRate >= 90 ? "Healthy" : passRate >= 75 ? "Needs attention" : "At risk"}
                tone={passRate >= 90 ? "green" : passRate >= 75 ? "amber" : "red"}
                source={`QA sheet · ${reg.executionPct}% executed`}
              />
            ) : (
              <EmptyMetric label="QA pass rate" cta="Upload a QA sheet" onClick={() => navigate("health", { subtab: "qa" })} />
            )}
            <Metric
              label="Awaiting review"
              value={pending.length}
              caption={pending.length ? "Needs your approval" : "All clear"}
              tone={pending.length ? "blue" : "green"}
              source="Drafts queue"
            />
            {repo ? (
              <Metric
                label="Commits today"
                value={repo.today.commits}
                caption={`${repo.pulls.merged} PRs merged (30d)`}
                source={`GitHub · ${repo.owner}/${repo.repo}`}
              />
            ) : (
              <EmptyMetric label="Engineering" cta={status?.githubConfigured ? "Loading…" : "Connect GitHub"} onClick={() => navigate("connections")} />
            )}
          </>
        )}
      </FadeIn>

      {/* Attention */}
      <Section
        className="!mt-12"
        title="Needs your attention"
        description="Signals computed from your connected data. Each one names its source."
      >
        {loadingAny ? (
          <Skeleton className="h-28 w-full" />
        ) : signals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-5 py-6 text-sm text-muted">
            Nothing stands out right now. {!reg && "Upload a QA sheet or "}
            {!project && "pick a project "}
            {(!reg || !project) && "to give PM Agent more to watch."}
          </div>
        ) : (
          <div className="divide-hairline overflow-hidden rounded-xl border border-border bg-panel">
            {signals.map((s, i) => {
              const Icon = s.icon;
              return (
                <FadeIn key={s.id} delay={0.1 + i * 0.04} className="flex gap-4 p-5">
                  <div className="mt-0.5">
                    <Badge tone={s.tone}>
                      <Icon size={12} />
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.title}</div>
                    <p className="mt-1 text-sm text-muted">{s.body}</p>
                    {s.items && s.items.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm">
                        {s.items.map((it) => (
                          <li key={it} className="flex gap-2 text-fg/80">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-subtle" />
                            <span className="min-w-0">{it}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {s.actions.map((a) => (
                        <Button key={a.label} size="sm" variant={a.primary ? "primary" : "secondary"} onClick={a.run}>
                          {a.label}
                        </Button>
                      ))}
                      <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
                      {s.sources.map((src) => (
                        <SourceChip key={src.label} kind={src.kind} label={src.label} />
                      ))}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}
      </Section>

      {/* Release status */}
      {release !== undefined && release !== null && (
        <Section
          className="!mt-12"
          title={release.found ? `Release: ${release.version}` : "Release status"}
          description={release.found ? `${release.total} issues in ${projectKey} tagged for this release.` : undefined}
          action={
            release.found ? (
              <a href={release.jiraUrl} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-accent hover:text-accent-hover">
                Open in Jira
              </a>
            ) : undefined
          }
        >
          {release.found ? (
            <ReleaseDonut total={release.total} statusBreakdown={release.statusBreakdown} />
          ) : (
            <p className="text-sm text-muted">
              No version named "MVP 2.0" found in {projectKey}.
              {release.availableVersions?.length > 0 && ` Versions available: ${release.availableVersions.join(", ")}.`}
            </p>
          )}
        </Section>
      )}

      {/* Ask */}
      <Section title="Ask your product anything">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ask.trim()) navigate("agent", { question: ask.trim() });
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-panel p-2 pl-4 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15"
        >
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="What would you like to know?"
            aria-label="Ask PM Agent"
            className="h-9 flex-1 !border-0 !bg-transparent px-0 text-[15px] !shadow-none"
          />
          <Button type="submit" variant="primary" size="sm" aria-label="Ask" disabled={!ask.trim()} icon={ArrowUp} />
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
            <button
              key={p}
              onClick={() => navigate("agent", { question: p })}
              className="btn rounded-md border border-border px-2.5 py-1 text-[13px] text-muted hover:border-fg/20 hover:text-fg"
            >
              {p}
            </button>
          ))}
        </div>
      </Section>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Section title="Recent drafts" action={<LinkMore onClick={() => navigate("drafts")} />}>
          {drafts === null ? (
            <Skeleton className="h-24 w-full" />
          ) : drafts.length === 0 ? (
            <p className="text-sm text-muted">Nothing drafted yet. Studio and Feedback turn briefs and notes into Jira-ready drafts.</p>
          ) : (
            <ul className="divide-hairline">
              {drafts.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => navigate("drafts", { subtab: d.id })}
                    className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-accent"
                  >
                    <span className="min-w-0 flex-1 truncate">{d.title}</span>
                    <DraftStatus status={d.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent activity" action={<LinkMore onClick={() => navigate("activity")} />}>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Questions you ask and checks you run will show up here.</p>
          ) : (
            <ul className="divide-hairline">
              {activity.map((a) => (
                <li key={a.at} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{a.text}</span>
                  <span className="shrink-0 text-xs text-subtle">{relativeTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

const STATUS_TONE: { test: RegExp; hex: string }[] = [
  { test: /ready for deployment|^done$|closed/i, hex: "#34d399" }, // green
  { test: /qa failed|blocked|not a defect/i, hex: "#f87171" }, // red
  { test: /code review/i, hex: "#a78bfa" }, // violet
  { test: /qa/i, hex: "#fbbf24" }, // amber
  { test: /progress|to do|enhancement/i, hex: "#38bdf8" }, // blue
];
function statusColor(status: string): string {
  return STATUS_TONE.find((t) => t.test.test(status))?.hex ?? "rgb(var(--color-fg) / 0.3)";
}

/** A plain SVG ring chart — no charting library, just stacked <circle> strokes
 * with a running dash offset. Fine at this size and this few segments. */
function ReleaseDonut({ total, statusBreakdown }: { total: number; statusBreakdown: { status: string; count: number }[] }) {
  const size = 180;
  const thickness = 24;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--color-fg) / 0.06)" strokeWidth={thickness} />
          {statusBreakdown
            .filter((s) => s.count > 0)
            .map((s) => {
              const dash = total ? (s.count / total) * circumference : 0;
              const el = (
                <circle
                  key={s.status}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={statusColor(s.status)}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += dash;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="tabular text-2xl font-semibold tracking-tight">{total}</div>
          <div className="text-[11px] text-muted">issues</div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {statusBreakdown.map((s) => (
          <li key={s.status} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: statusColor(s.status) }} />
              <span className="truncate">{s.status}</span>
            </span>
            <span className="tabular shrink-0 font-medium">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyMetric({ label, cta, onClick }: { label: string; cta: string; onClick: () => void }) {
  return (
    <div>
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1.5 text-[32px] font-semibold leading-none tracking-tight text-fg/20">—</div>
      <button onClick={onClick} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
        {cta} <ArrowRight size={12} />
      </button>
    </div>
  );
}

function LinkMore({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[13px] text-muted hover:text-fg">
      View all
    </button>
  );
}

export function DraftStatus({ status }: { status: string }) {
  const tone: Tone = status === "approved" ? "green" : status === "rejected" ? "neutral" : status === "ready for grooming" ? "blue" : "amber";
  return (
    <Badge tone={tone} dot>
      {status}
    </Badge>
  );
}
