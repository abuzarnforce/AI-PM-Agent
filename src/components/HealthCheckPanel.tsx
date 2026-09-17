"use client";

import { useState } from "react";

const VERDICT_STYLES: Record<string, string> = {
  "on track": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "at risk": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  blocked: "bg-red-500/15 text-red-300 border-red-500/30",
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

  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <div>
      <div className="mb-1 text-sm font-medium text-white/70">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-white/30">none found</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((it, i) => (
            <li key={i} className="rounded border border-border bg-panel px-3 py-1.5">
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Health Check</h1>
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
              className="w-40 rounded-md border border-border bg-panel px-3 py-1.5 outline-none focus:border-accent"
            />
          </label>
          <span className="pb-2 text-white/30">or</span>
          <label className="text-sm">
            <div className="mb-1 text-white/50">Sprint name</div>
            <input
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint 24"
              className="w-40 rounded-md border border-border bg-panel px-3 py-1.5 outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-white/50">Stale after (days)</div>
            <input
              type="number"
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
              className="w-24 rounded-md border border-border bg-panel px-3 py-1.5 outline-none focus:border-accent"
            />
          </label>
          <button
            onClick={run}
            disabled={loading || (!epicKey && !sprintName)}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Running…" : "Run health check"}
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {report && (
          <>
            <div
              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium ${VERDICT_STYLES[report.verdict]}`}
            >
              {report.verdict.toUpperCase()} — {report.verdictReason}
            </div>
            <Section
              title="Stories missing acceptance criteria"
              items={report.missingAcceptanceCriteria.map((i: any) => `${i.key}: ${i.summary}`)}
            />
            <Section
              title="Unestimated stories"
              items={report.unestimated.map((i: any) => `${i.key}: ${i.summary}`)}
            />
            <Section
              title="Stale tickets"
              items={report.stale.map((i: any) => `${i.key}: ${i.summary} (${i.daysSinceUpdate}d)`)}
            />
            <Section title="Scope drift" items={report.scopeDrift} />
            <Section title="QA coverage gaps" items={report.qaCoverageGaps} />
          </>
        )}
      </div>
    </div>
  );
}
