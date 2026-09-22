"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Upload, CheckCircle2, XCircle, ShieldAlert, Clock, Bot } from "lucide-react";

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

interface TestCaseTrackerSummary {
  total: number;
  done: number;
  byAssignee: { assignee: string; total: number; done: number }[];
}

interface AutomationSummary {
  total: number;
  done: number;
  inProgress: number;
  notStarted: number;
}

interface QaSnapshot {
  uploadedAt: string;
  sourceFileName: string;
  regression: RegressionSummary | null;
  testcaseTracker: TestCaseTrackerSummary | null;
  automation: AutomationSummary | null;
}

const RESULT_COLOR: Record<string, string> = {
  Pass: "#34d399",
  Fail: "#f87171",
  Blocked: "#fbbf24",
  "Not Executed": "#94a3b8",
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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
    } catch (err: any) {
      setError(err.message ?? "Failed to upload");
    } finally {
      setUploading(false);
    }
  }

  const reg = snapshot?.regression;
  const tracker = snapshot?.testcaseTracker;
  const automation = snapshot?.automation;

  const featureMax = reg ? Math.max(...reg.byFeature.map((f) => f.pass + f.fail + f.blocked + f.notExecuted), 1) : 1;
  const testerMax = tracker ? Math.max(...tracker.byAssignee.map((a) => a.total), 1) : 1;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-fg/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-panel-title">QA Dashboard</h1>
            <p className="text-sm text-fg/50">
              Regression results, test case completion, and automation coverage — computed from your team's QA
              tracking sheet, re-uploaded whenever it changes.
            </p>
          </div>
          <div className="shrink-0">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelected} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Upload size={13} className={uploading ? "animate-pulse" : ""} />
              {uploading ? "Uploading…" : snapshot ? "Re-upload sheet" : "Upload QA sheet"}
            </button>
          </div>
        </div>
        {snapshot && (
          <div className="mt-2 text-xs text-fg/30">
            {snapshot.sourceFileName} · uploaded {relativeTime(snapshot.uploadedAt)}
          </div>
        )}
      </div>

      <div className="space-y-5 p-4">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && !snapshot && (
          <div className="py-16 text-center text-sm text-fg/30">Loading…</div>
        )}

        {!loading && !snapshot && !error && (
          <div className="card-surface flex items-center gap-3 rounded-2xl p-4 text-sm text-fg/60">
            <FlaskConical size={16} className="shrink-0 text-fg/40" />
            No QA sheet uploaded yet. Upload the team's Regression / Testcase_Tracker / Automation_Scenarios
            workbook to see live coverage here — the same file also feeds Health Check's QA gap analysis.
          </div>
        )}

        {snapshot && (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="card-surface rounded-2xl p-4"
              >
                <CheckCircle2 size={16} className="text-emerald-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{reg?.executionPct ?? "—"}%</div>
                <div className="text-xs text-fg/40">Regression executed</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.05 }}
                className="card-surface rounded-2xl p-4"
              >
                <XCircle size={16} className="text-red-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{(reg?.fail ?? 0) + (reg?.blocked ?? 0)}</div>
                <div className="text-xs text-fg/40">Failing / blocked</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.1 }}
                className="card-surface rounded-2xl p-4"
              >
                <ShieldAlert size={16} className="text-amber-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {tracker ? `${tracker.done}/${tracker.total}` : "—"}
                </div>
                <div className="text-xs text-fg/40">Test cases done</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.15 }}
                className="card-surface rounded-2xl p-4"
              >
                <Bot size={16} className="text-violet-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {automation ? `${automation.done}/${automation.total}` : "—"}
                </div>
                <div className="text-xs text-fg/40">Automated (done)</div>
              </motion.div>
            </div>

            {reg && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.2 }}
                className="card-surface rounded-2xl p-4"
              >
                <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                  <FlaskConical size={14} />
                  Regression results
                </div>
                <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-fg/5">
                  {(["Pass", "Fail", "Blocked", "Not Executed"] as const).map((label) => {
                    const count =
                      label === "Pass" ? reg.pass : label === "Fail" ? reg.fail : label === "Blocked" ? reg.blocked : reg.notExecuted;
                    return (
                      <div
                        key={label}
                        style={{ width: `${reg.total ? (count / reg.total) * 100 : 0}%`, backgroundColor: RESULT_COLOR[label] }}
                        title={`${label}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-fg/60">
                  {(["Pass", "Fail", "Blocked", "Not Executed"] as const).map((label) => {
                    const count =
                      label === "Pass" ? reg.pass : label === "Fail" ? reg.fail : label === "Blocked" ? reg.blocked : reg.notExecuted;
                    return (
                      <span key={label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RESULT_COLOR[label] }} />
                        {label}: <span className="font-medium text-fg">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {reg && reg.byFeature.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.25 }}
                className="card-surface rounded-2xl p-4"
              >
                <div className="mb-3 text-sm font-medium text-fg/70">Results by feature</div>
                <div className="space-y-2">
                  {reg.byFeature.map((f, i) => {
                    const featTotal = f.pass + f.fail + f.blocked + f.notExecuted;
                    return (
                      <div key={f.feature} className="flex items-center gap-3 text-sm">
                        <span className="w-40 shrink-0 truncate text-fg/60" title={f.feature}>
                          {f.feature}
                        </span>
                        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-fg/5">
                          {f.fail > 0 && (
                            <motion.div
                              className="h-full"
                              style={{ backgroundColor: RESULT_COLOR.Fail }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(f.fail / featureMax) * 100}%` }}
                              transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.3 + i * 0.03 }}
                            />
                          )}
                          {f.blocked > 0 && (
                            <motion.div
                              className="h-full"
                              style={{ backgroundColor: RESULT_COLOR.Blocked }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(f.blocked / featureMax) * 100}%` }}
                              transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.3 + i * 0.03 }}
                            />
                          )}
                          <motion.div
                            className="h-full"
                            style={{ backgroundColor: RESULT_COLOR.Pass }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(f.pass / featureMax) * 100}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.3 + i * 0.03 }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs text-fg/50">
                          {featTotal - f.notExecuted}/{featTotal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {reg && reg.failingOrBlocked.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.3 }}
                className="card-surface rounded-2xl p-4"
              >
                <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                  <XCircle size={14} className="text-red-300" />
                  Currently failing / blocked
                </div>
                <ul className="space-y-1.5 text-sm">
                  {reg.failingOrBlocked.map((r, i) => (
                    <li key={i} className="card-accent rounded-lg px-3 py-1.5" style={{ "--accent-color": RESULT_COLOR[r.result] } as React.CSSProperties}>
                      <span className="font-medium">{r.feature}</span> — {r.scenario}
                      <span className="ml-2 text-xs text-fg/40">
                        {r.assignee} · {r.result}
                        {r.remark ? ` · ${r.remark}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {tracker && tracker.byAssignee.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.35 }}
                className="card-surface rounded-2xl p-4"
              >
                <div className="mb-3 text-sm font-medium text-fg/70">Test cases by tester</div>
                <div className="space-y-2">
                  {tracker.byAssignee
                    .sort((a, b) => b.total - a.total)
                    .map((a, i) => (
                      <div key={a.assignee} className="flex items-center gap-3 text-sm">
                        <span className="w-28 shrink-0 truncate text-fg/60" title={a.assignee}>
                          {a.assignee}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-fg/5">
                          <motion.div
                            className="h-full rounded-full bg-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${(a.total / testerMax) * 100}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.4 + i * 0.03 }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs text-fg/50">
                          {a.done}/{a.total} done
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {automation && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.4 }}
                className="card-surface rounded-2xl p-4"
              >
                <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                  <Bot size={14} />
                  Automation coverage
                </div>
                <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-fg/5">
                  <div style={{ width: `${(automation.done / automation.total) * 100}%`, backgroundColor: "#34d399" }} title={`Done: ${automation.done}`} />
                  <div
                    style={{ width: `${(automation.inProgress / automation.total) * 100}%`, backgroundColor: "#fbbf24" }}
                    title={`In progress: ${automation.inProgress}`}
                  />
                  <div
                    style={{ width: `${(automation.notStarted / automation.total) * 100}%`, backgroundColor: "#94a3b8" }}
                    title={`Not started: ${automation.notStarted}`}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-fg/60">
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} /> Done: <span className="font-medium text-fg">{automation.done}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} /> In progress: <span className="font-medium text-fg">{automation.inProgress}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} /> Not started: <span className="font-medium text-fg">{automation.notStarted}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
