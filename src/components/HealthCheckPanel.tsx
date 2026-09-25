"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, HeartPulse } from "lucide-react";
import { useJiraBaseUrl, linkifyTicketKeys } from "@/lib/useJiraBaseUrl";
import { useNav } from "@/lib/nav";
import { logActivity } from "@/lib/activity";
import { Button, EmptyState, ErrorState, Field, PageHeader, Section, SourceChip, Tabs, WorkingState, inputCls } from "./ui";
import QaDashboardPanel from "./QaDashboardPanel";

type HealthTab = "check" | "qa";

export default function HealthCenter() {
  const { intent } = useNav();
  const [tab, setTab] = useState<HealthTab>(intent?.subtab === "qa" ? "qa" : "check");
  return (
    <div className="page">
      <PageHeader
        eyebrow="Health"
        title="Is the work on track?"
        description="Check an epic or sprint for missing acceptance criteria, estimates, stale tickets and scope drift — alongside what QA is telling you."
      >
        <Tabs
          id="health"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "check", label: "Epic & sprint" },
            { id: "qa", label: "QA" },
          ]}
        />
      </PageHeader>
      {tab === "check" ? <HealthCheck /> : <QaDashboardPanel />}
    </div>
  );
}

const VERDICT: Record<string, { tone: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  "on track": { tone: "text-emerald-400", bg: "bg-emerald-500/[0.06] border-emerald-500/20", icon: CheckCircle2, label: "On track" },
  "at risk": { tone: "text-amber-400", bg: "bg-amber-500/[0.06] border-amber-500/20", icon: AlertTriangle, label: "At risk" },
  blocked: { tone: "text-red-400", bg: "bg-red-500/[0.06] border-red-500/20", icon: XCircle, label: "Blocked" },
};

const STEPS = [
  "Reading Jira issues…",
  "Checking acceptance criteria and estimates…",
  "Comparing against the epic's original scope…",
  "Cross-referencing QA results…",
  "Writing your verdict…",
];

function HealthCheck() {
  const [epicKey, setEpicKey] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [staleDays, setStaleDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const jiraBaseUrl = useJiraBaseUrl();

  async function run() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epicKey: epicKey.trim() || undefined, sprintName: sprintName.trim() || undefined, staleDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
      logActivity("health", `Health check on ${data.report.epicOrSprint}: ${data.report.verdict}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const checks = report
    ? [
        { title: "Missing acceptance criteria", question: "Can these be tested?", items: report.missingAcceptanceCriteria.map((i: any) => `${i.key}: ${i.summary}`) },
        { title: "Unestimated", question: "Can we forecast this?", items: report.unestimated.map((i: any) => `${i.key}: ${i.summary}`) },
        { title: "Scope drift", question: "Are we still building what we planned?", items: report.scopeDrift },
        { title: "QA coverage gaps", question: "What could slip through?", items: report.qaCoverageGaps },
      ]
    : [];
  const staleMax = report ? Math.max(...report.stale.map((s: any) => s.daysSinceUpdate), 1) : 1;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field label="Epic key" className="w-full sm:w-40">
          <input value={epicKey} onChange={(e) => setEpicKey(e.target.value)} placeholder="ONEHR-123" className={inputCls} />
        </Field>
        <span className="hidden pb-2.5 text-sm text-subtle sm:block">or</span>
        <Field label="Sprint name" className="w-full sm:w-48">
          <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint 24" className={inputCls} />
        </Field>
        <Field label="Stale after" hint="days" className="w-28">
          <input type="number" min={1} value={staleDays} onChange={(e) => setStaleDays(Number(e.target.value))} className={inputCls} />
        </Field>
        <Button type="submit" variant="primary" icon={HeartPulse} loading={loading} disabled={!epicKey.trim() && !sprintName.trim()}>
          Run health check
        </Button>
      </form>

      <div className="mt-10">
        {error && <ErrorState message={error} onRetry={run} />}
        {loading && <WorkingState steps={STEPS} interval={2200} />}
        {!report && !loading && !error && (
          <EmptyState
            icon={HeartPulse}
            title="Pick an epic or a sprint"
            description="PM Agent reads every issue in scope, flags what's missing, and ends with a one-line verdict you can defend."
          />
        )}

        {report && (
          <>
            {(() => {
              const v = VERDICT[report.verdict] ?? VERDICT["at risk"];
              const Icon = v.icon;
              return (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-6 ${v.bg}`}>
                  <div className="text-[13px] text-muted">{report.epicOrSprint} · verdict</div>
                  <div className={`mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight ${v.tone}`}>
                    <Icon size={22} />
                    {v.label}
                  </div>
                  <p className="mt-2 max-w-3xl text-[15px] leading-relaxed">{linkifyTicketKeys(report.verdictReason, jiraBaseUrl)}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <SourceChip kind="Jira" label={report.epicOrSprint} />
                    <span className="self-center text-[11px] text-subtle">AI-assisted verdict — review before sharing.</span>
                  </div>
                </motion.div>
              );
            })()}

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-6 sm:grid-cols-5">
              {[...checks.slice(0, 2), { title: "Stale", items: report.stale }, ...checks.slice(2)].map((c) => (
                <div key={c.title}>
                  <div className="text-[13px] text-muted">{c.title}</div>
                  <div className={`tabular mt-1 text-2xl font-semibold ${c.items.length ? "" : "text-emerald-400"}`}>{c.items.length || "✓"}</div>
                </div>
              ))}
            </div>

            <Section title="Which tickets are aging?" description={`No update in ${staleDays}+ days, oldest first.`} className="!mt-10">
              {report.stale.length === 0 ? (
                <p className="text-sm text-muted">Nothing stale. Every ticket moved recently.</p>
              ) : (
                <ul className="space-y-2">
                  {[...report.stale]
                    .sort((a: any, b: any) => b.daysSinceUpdate - a.daysSinceUpdate)
                    .map((s: any) => (
                      <li key={s.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(0,1fr)_10rem_3rem]">
                        <span className="truncate">{linkifyTicketKeys(`${s.key}: ${s.summary}`, jiraBaseUrl)}</span>
                        <div className="hidden h-1.5 overflow-hidden rounded-full bg-fg/[0.06] sm:block">
                          <motion.div
                            className="h-full rounded-full bg-amber-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${(s.daysSinceUpdate / staleMax) * 100}%` }}
                          />
                        </div>
                        <span className="tabular text-right text-xs text-muted">{s.daysSinceUpdate}d</span>
                      </li>
                    ))}
                </ul>
              )}
            </Section>

            {checks.map((c) => (
              <Section key={c.title} title={c.title} description={c.question}>
                {c.items.length === 0 ? (
                  <p className="text-sm text-muted">None found.</p>
                ) : (
                  <ul className="divide-hairline border-y border-border">
                    {c.items.map((it: string, i: number) => (
                      <li key={i} className="py-2.5 text-sm leading-relaxed">
                        {linkifyTicketKeys(it, jiraBaseUrl)}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
