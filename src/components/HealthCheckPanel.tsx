"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const VERDICT_STYLES: Record<string, { classes: string; icon: typeof CheckCircle2 }> = {
  "on track": { classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  "at risk": { classes: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: AlertTriangle },
  blocked: { classes: "bg-red-500/15 text-red-300 border-red-500/30", icon: XCircle },
};

export default function HealthCheckPanel() {
  const [epicKey, setEpicKey] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [staleDays, setStaleDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epicKey: epicKey || undefined,
          sprintName: sprintName || undefined,
          staleDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const Section = ({ title, items, delay }: { title: string; items: string[]; delay: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3, delay }}
    >
      <div className="mb-1.5 text-sm font-medium text-white/70">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-white/30">none found</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((it, i) => (
            <li key={i} className="card-surface rounded-lg px-3 py-1.5">
              {it}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-white/[0.06] p-4">
        <h1 className="text-lg font-semibold tracking-tight">Health Check</h1>
        <p className="mb-3 text-sm text-white/50">
          Report on an epic or sprint: missing AC, unestimated stories, stale tickets, scope drift, QA gaps.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <div className="mb-1 text-white/50">Epic key</div>
            <input
              value={epicKey}
              onChange={(e) => setEpicKey(e.target.value)}
              placeholder="ONEHR-123"
              className="w-40 rounded-md border border-white/10 bg-panel px-3 py-1.5 outline-none transition-colors focus:border-accent"
            />
          </label>
          <span className="pb-2 text-white/30">or</span>
          <label className="text-sm">
            <div className="mb-1 text-white/50">Sprint name</div>
            <input
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint 24"
              className="w-40 rounded-md border border-white/10 bg-panel px-3 py-1.5 outline-none transition-colors focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-white/50">Stale after (days)</div>
            <input
              type="number"
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
              className="w-24 rounded-md border border-white/10 bg-panel px-3 py-1.5 outline-none transition-colors focus:border-accent"
            />
          </label>
          <button
            onClick={run}
            disabled={loading || (!epicKey && !sprintName)}
            className="btn flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Activity size={14} />
            {loading ? "Running…" : "Run health check"}
          </button>
        </div>
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
        {report && (
          <>
            {(() => {
              const v = VERDICT_STYLES[report.verdict];
              const VIcon = v.icon;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${v.classes}`}
                >
                  <VIcon size={15} />
                  {report.verdict.toUpperCase()} — {report.verdictReason}
                </motion.div>
              );
            })()}
            <Section
              title="Stories missing acceptance criteria"
              items={report.missingAcceptanceCriteria.map((i: any) => `${i.key}: ${i.summary}`)}
              delay={0.05}
            />
            <Section
              title="Unestimated stories"
              items={report.unestimated.map((i: any) => `${i.key}: ${i.summary}`)}
              delay={0.1}
            />
            <Section
              title="Stale tickets"
              items={report.stale.map((i: any) => `${i.key}: ${i.summary} (${i.daysSinceUpdate}d)`)}
              delay={0.15}
            />
            <Section title="Scope drift" items={report.scopeDrift} delay={0.2} />
            <Section title="QA coverage gaps" items={report.qaCoverageGaps} delay={0.25} />
          </>
        )}
      </div>
    </div>
  );
}
