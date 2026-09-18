"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, RefreshCw, Bug, TrendingUp, TrendingDown } from "lucide-react";

interface StatusBucket {
  label: string;
  count: number;
  jql: string;
}

interface TypeBucket {
  type: string;
  count: number;
}

interface WidgetData {
  projectKey: string;
  statusBreakdown: StatusBucket[];
  issueTypeBreakdown: TypeBucket[];
  openBugs: number;
  createdLast30: number;
  resolvedLast30: number;
}

const STATUS_COLOR: Record<string, string> = {
  "To Do": "#94a3b8",
  "In Progress": "#5b8def",
  Done: "#34d399",
};

export default function DashboardsPanel() {
  const [projectKey, setProjectKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WidgetData | null>(null);

  async function load() {
    if (!projectKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard-widgets?projectKey=${encodeURIComponent(projectKey)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const statusTotal = data ? data.statusBreakdown.reduce((s, b) => s + b.count, 0) : 0;
  const typeMax = data ? Math.max(...data.issueTypeBreakdown.map((t) => t.count), 1) : 1;
  const net = data ? data.createdLast30 - data.resolvedLast30 : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-white/[0.06] p-4">
        <h1 className="text-panel-title">Dashboards</h1>
        <p className="mb-3 text-sm text-white/50">
          Live snapshots computed directly from Jira via JQL. These are our own widgets, not a
          copy of your native Jira dashboards — Jira doesn't expose gadget filters or chart data
          through its API, only titles and layout. Each number here is a live, independently
          computed count, not a guess.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Project key (e.g. ONEHR)"
            className="w-56 rounded-md border border-white/10 bg-panel px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            onClick={load}
            disabled={loading || !projectKey.trim()}
            className="btn flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading…" : "Load"}
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

        {!data && !loading && !error && (
          <div className="py-16 text-center text-sm text-white/30">
            Enter a project key and click Load to see live status, type, and trend breakdowns.
          </div>
        )}

        {data && (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="card-surface rounded-2xl p-4"
              >
                <Bug size={16} className="text-red-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{data.openBugs}</div>
                <div className="text-xs text-white/40">Open bugs</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.05 }}
                className="card-surface rounded-2xl p-4"
              >
                <TrendingUp size={16} className="text-amber-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{data.createdLast30}</div>
                <div className="text-xs text-white/40">Created (30d)</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.1 }}
                className="card-surface rounded-2xl p-4"
              >
                <TrendingDown size={16} className="text-emerald-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{data.resolvedLast30}</div>
                <div className="text-xs text-white/40">
                  Resolved (30d) {net !== 0 && <span className={net > 0 ? "text-amber-300" : "text-emerald-300"}>({net > 0 ? "+" : ""}{net} net)</span>}
                </div>
              </motion.div>
            </div>

            {/* Status breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.15 }}
              className="card-surface rounded-2xl p-4"
            >
              <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white/70">
                <LayoutGrid size={14} />
                Issues by status category
              </div>
              <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-white/5">
                {data.statusBreakdown.map((b) => (
                  <div
                    key={b.label}
                    style={{
                      width: `${statusTotal ? (b.count / statusTotal) * 100 : 0}%`,
                      backgroundColor: STATUS_COLOR[b.label],
                    }}
                    title={`${b.label}: ${b.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-white/60">
                {data.statusBreakdown.map((b) => (
                  <span key={b.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[b.label] }} />
                    {b.label}: <span className="font-medium text-white">{b.count}</span>
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Issue type breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.2 }}
              className="card-surface rounded-2xl p-4"
            >
              <div className="mb-3 text-sm font-medium text-white/70">Issues by type</div>
              <div className="space-y-2">
                {data.issueTypeBreakdown
                  .sort((a, b) => b.count - a.count)
                  .map((t, i) => (
                    <div key={t.type} className="flex items-center gap-3 text-sm">
                      <span className="w-20 shrink-0 text-white/60">{t.type}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          className="h-full rounded-full bg-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${(t.count / typeMax) * 100}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.25 + i * 0.03 }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-medium">{t.count}</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
