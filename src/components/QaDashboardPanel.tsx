"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Upload } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { Button, EmptyState, ErrorState, Metric, Section, Skeleton, relativeTime } from "./ui";

interface RegressionSummary {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  notExecuted: number;
  executionPct: number;
  byFeature: { feature: string; pass: number; fail: number; blocked: number; notExecuted: number }[];
  failingOrBlocked: { feature: string; scenario: string; assignee: string; result: string; remark: string }[];
}

interface QaSnapshot {
  uploadedAt: string;
  sourceFileName: string;
  regression: RegressionSummary | null;
  testcaseTracker: { total: number; done: number; byAssignee: { assignee: string; total: number; done: number }[] } | null;
  automation: { total: number; done: number; inProgress: number; notStarted: number } | null;
}

const C = {
  pass: "rgb(var(--tone-green))",
  fail: "rgb(var(--tone-red))",
  blocked: "rgb(var(--tone-orange))",
  idle: "rgb(var(--color-fg) / 0.12)",
};

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

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-6 lg:grid-cols-4">
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

          {reg && (
            <Section title="Are we ready to release?" description="Regression results across the whole suite." className="!mt-10">
              <StackBar
                total={reg.total}
                parts={[
                  { label: "Pass", value: reg.pass, color: C.pass },
                  { label: "Fail", value: reg.fail, color: C.fail },
                  { label: "Blocked", value: reg.blocked, color: C.blocked },
                  { label: "Not executed", value: reg.notExecuted, color: C.idle },
                ]}
              />
            </Section>
          )}

          {reg && reg.failingOrBlocked.length > 0 && (
            <Section title="What's failing right now?" description={`${reg.failingOrBlocked.length} scenarios, from the Regression sheet.`}>
              <ul className="divide-hairline border-y border-border">
                {reg.failingOrBlocked.map((r, i) => (
                  <li key={i} className="flex gap-3 py-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: r.result === "Fail" ? C.fail : C.blocked }} />
                    <div className="min-w-0">
                      <div>
                        <span className="font-medium">{r.feature}</span> — {r.scenario}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {r.result} · {r.assignee}
                        {r.remark ? ` · ${r.remark}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {reg && reg.byFeature.length > 0 && (
            <Section title="Where are defects concentrated?" description="Results by feature, most failures first.">
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
