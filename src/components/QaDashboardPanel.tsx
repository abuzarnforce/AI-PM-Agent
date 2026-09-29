"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Upload } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { Badge, Button, EmptyState, ErrorState, Metric, Section, Skeleton, relativeTime, type Tone } from "./ui";

interface RegressionSummary {
  release: string;
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  inProgress: number;
  notExecuted: number;
  executionPct: number;
  testers: string[];
  byFeature: { feature: string; pass: number; fail: number; blocked: number; notExecuted: number }[];
  failingOrBlocked: { feature: string; scenario: string; assignee: string; result: string; remark: string }[];
}

interface TestCaseTrackerSummary {
  total: number;
  done: number;
  byAssignee: { assignee: string; total: number; done: number }[];
  releases?: { release: string; total: number; done: number; byAssignee: { assignee: string; total: number; done: number }[] }[];
}

interface QaSnapshot {
  uploadedAt: string;
  sourceFileName: string;
  regression: RegressionSummary | null;
  regressionByRelease: RegressionSummary[];
  testcaseTracker: TestCaseTrackerSummary | null;
  automation: { total: number; done: number; inProgress: number; notStarted: number } | null;
}

const C = {
  pass: "rgb(var(--tone-green))",
  fail: "rgb(var(--tone-red))",
  blocked: "rgb(var(--tone-orange))",
  progress: "rgb(var(--tone-blue))",
  idle: "rgb(var(--color-fg) / 0.12)",
};

/** Not a fabricated AI judgment — a plain rule over the counts already on screen
 * (blocked > 0, any failures, or nothing executed yet), so the badge always
 * traces back to a number the PM can see right next to it. */
function releaseVerdict(r: RegressionSummary): { label: string; tone: Tone } {
  if (r.blocked > 0) return { label: "Blocked", tone: "red" };
  if (r.fail > 0) return { label: "At risk", tone: "amber" };
  if (r.pass === 0 && r.inProgress === 0) return { label: "Not started", tone: "neutral" };
  if (r.executionPct < 100) return { label: "In progress", tone: "amber" };
  return { label: "On track", tone: "green" };
}

function StackBar({ parts, total }: { parts: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-fg/[0.06]" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p) => (
          <motion.div
            key={p.label}
            initial={{ width: 0 }}
            animate={{ width: `${total ? (p.value / total) * 100 : 0}%` }}
            style={{ backgroundColor: p.color }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.label} <span className="tabular font-medium text-fg">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReleaseCard({ r }: { r: RegressionSummary }) {
  const v = releaseVerdict(r);
  const executed = r.pass + r.fail + r.blocked;
  const executedPct = r.total ? Math.round((executed / r.total) * 100) : null;
  const passRate = executed ? Math.round((r.pass / executed) * 100) : null;

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold tracking-tight">{r.release}</div>
        <Badge tone={v.tone} dot>
          {v.label}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
        <Metric label="Executed" value={executedPct != null ? `${executedPct}%` : "—"} caption={`${executed}/${r.total} cases`} />
        <Metric label="Pass rate" value={passRate != null ? `${passRate}%` : "—"} caption={executed ? `of ${executed} executed` : "nothing executed yet"} />
        <Metric label="Test cases" value={String(r.total)} />
        <Metric label="Blocked" value={String(r.blocked)} tone={r.blocked ? "red" : undefined} />
        <Metric label="Testers executed" value={String(r.testers.length)} caption={r.testers.length ? r.testers.join(", ") : undefined} />
      </div>

      <div className="mt-4">
        <StackBar
          total={r.total}
          parts={[
            { label: "Pass", value: r.pass, color: C.pass },
            { label: "Fail", value: r.fail, color: C.fail },
            { label: "Blocked", value: r.blocked, color: C.blocked },
            { label: "In progress", value: r.inProgress, color: C.progress },
            { label: "Not executed", value: r.notExecuted, color: C.idle },
          ]}
        />
      </div>

      {r.failingOrBlocked.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-border pt-3">
          {r.failingOrBlocked.slice(0, 4).map((f, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: f.result === "Fail" ? C.fail : C.blocked }} />
              <span className="text-muted">
                <span className="text-fg">{f.feature}</span> — {f.scenario} ({f.assignee || "unassigned"})
              </span>
            </div>
          ))}
          {r.failingOrBlocked.length > 4 && <div className="pl-3.5 text-xs text-subtle">+{r.failingOrBlocked.length - 4} more</div>}
        </div>
      )}
    </div>
  );
}

export default function QaDashboardPanel() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<QaSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/qa-sheet");
      const json = await res.json();
      setSnapshot(json.snapshot);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/qa-sheet/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSnapshot(json.snapshot);
      logActivity("qa", `Imported QA sheet ${file.name}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to upload");
    } finally {
      setUploading(false);
    }
  }

  const reg = snapshot?.regression;
  const releases = snapshot?.regressionByRelease ?? [];
  const tracker = snapshot?.testcaseTracker;
  const automation = snapshot?.automation;
  const executed = reg ? reg.pass + reg.fail + reg.blocked : 0;
  const passRate = reg && executed ? Math.round((reg.pass / executed) * 100) : null;
  const testerMax = tracker ? Math.max(...tracker.byAssignee.map((a) => a.total), 1) : 1;

  const uploadBtn = (
    <>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelected} />
      <Button variant={snapshot ? "secondary" : "primary"} icon={Upload} loading={uploading} onClick={() => fileInputRef.current?.click()}>
        {snapshot ? "Re-upload sheet" : "Upload QA sheet"}
      </Button>
    </>
  );

  return (
    <div>
      {error && (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      )}

      {loading && !snapshot && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {!loading && !snapshot && (
        <EmptyState
          icon={FlaskConical}
          title="No QA sheet yet"
          description="Upload the team's workbook (Regression, Testcase_Tracker, Automation_Scenarios). It powers this view and the QA gaps in every health check."
          action={uploadBtn}
        />
      )}

      {snapshot && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted">
              Source: <span className="text-fg">{snapshot.sourceFileName}</span> · imported {relativeTime(snapshot.uploadedAt)}
            </div>
            <div className="flex gap-2">{uploadBtn}</div>
          </div>

          <Section
            title="By MVP release"
            description={releases.length ? `${releases.length} release${releases.length === 1 ? "" : "s"} tracked — regression status, blockers, testers and test case counts.` : undefined}
            className="!mt-6"
          >
            {releases.length === 0 ? (
              <p className="text-sm text-muted">No release-tagged Regression sheet found (expected a sheet name like "Regression MVP 2.0").</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {releases.map((r) => (
                  <ReleaseCard key={r.release} r={r} />
                ))}
              </div>
            )}
          </Section>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-6 lg:grid-cols-4">
            <Metric
              label="Pass rate (executed)"
              value={passRate != null ? `${passRate}%` : "—"}
              caption={passRate == null ? undefined : passRate >= 90 ? "Healthy" : passRate >= 75 ? "Needs attention" : "At risk"}
              tone={passRate == null ? undefined : passRate >= 90 ? "green" : passRate >= 75 ? "amber" : "red"}
            />
            <Metric label="Executed" value={reg ? `${reg.executionPct}%` : "—"} caption={reg ? `${reg.notExecuted} not run` : undefined} />
            <Metric label="Test cases done" value={tracker ? `${tracker.done}/${tracker.total}` : "—"} />
            <Metric label="Automated" value={automation ? `${automation.done}/${automation.total}` : "—"} caption={automation ? `${automation.inProgress} in progress` : undefined} />
          </div>

          {reg && reg.byFeature.length > 0 && (
            <Section title="Where are defects concentrated?" description={`${reg.release} — results by feature, most failures first.`}>
              <div className="space-y-3">
                {[...reg.byFeature]
                  .sort((a, b) => b.fail + b.blocked - (a.fail + a.blocked))
                  .map((f) => {
                    const t = f.pass + f.fail + f.blocked + f.notExecuted;
                    return (
                      <div key={f.feature} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-4 text-sm sm:grid-cols-[12rem_1fr_4rem]">
                        <span className="truncate text-muted" title={f.feature}>
                          {f.feature}
                        </span>
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                          {[
                            [f.fail, C.fail],
                            [f.blocked, C.blocked],
                            [f.pass, C.pass],
                          ].map(([v, color], j) => (
                            <motion.div key={j} initial={{ width: 0 }} animate={{ width: `${t ? ((v as number) / t) * 100 : 0}%` }} style={{ backgroundColor: color as string }} />
                          ))}
                        </div>
                        <span className="tabular text-right text-xs text-muted">
                          {f.fail + f.blocked > 0 ? <span className="text-red-400">{f.fail + f.blocked} failing</span> : `${t - f.notExecuted}/${t}`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </Section>
          )}

          <div className="grid gap-x-10 lg:grid-cols-2">
            {tracker && tracker.byAssignee.length > 0 && (
              <Section title="Who's carrying the testing load?">
                <div className="space-y-3">
                  {[...tracker.byAssignee]
                    .sort((a, b) => b.total - a.total)
                    .map((a) => (
                      <div key={a.assignee} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-3 text-sm">
                        <span className="truncate text-muted" title={a.assignee}>
                          {a.assignee}
                        </span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                          <motion.div className="h-full rounded-full bg-fg/70" initial={{ width: 0 }} animate={{ width: `${(a.total / testerMax) * 100}%` }} />
                        </div>
                        <span className="tabular text-right text-xs text-muted">
                          {a.done}/{a.total} done
                        </span>
                      </div>
                    ))}
                </div>
              </Section>
            )}
            {automation && (
              <Section title="How much is automated?">
                <StackBar
                  total={automation.total}
                  parts={[
                    { label: "Done", value: automation.done, color: C.pass },
                    { label: "In progress", value: automation.inProgress, color: C.blocked },
                    { label: "Not started", value: automation.notStarted, color: C.idle },
                  ]}
                />
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
