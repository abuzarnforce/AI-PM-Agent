"use client";

import { useEffect, useState } from "react";

interface Draft {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  source: string;
  createdAt: string;
  result?: { key: string; url: string };
}

const STATUS_STYLES: Record<string, string> = {
  "needs triage": "bg-amber-500/15 text-amber-300",
  "ready for grooming": "bg-sky-500/15 text-sky-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-white/10 text-white/40",
};

export default function DraftsPanel() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/drafts");
    const data = await res.json();
    setDrafts(data.drafts ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to approve");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await fetch("/api/drafts/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Drafts</h1>
        <p className="text-sm text-white/50">
          Nothing is written to Jira until you approve it here (Hard Rule 1).
        </p>
      </div>
      <div className="space-y-3 p-4">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {drafts.length === 0 && <div className="text-sm text-white/40">No drafts yet.</div>}
        {drafts.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">{d.title}</div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}>
                {d.status}
              </span>
            </div>
            <pre className="mb-2 whitespace-pre-wrap rounded bg-bg p-3 text-xs text-white/80">{d.body}</pre>
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Source: {d.source}</span>
              {d.result ? (
                <a href={d.result.url} target="_blank" className="text-accent underline">
                  {d.result.key}
                </a>
              ) : (
                d.status === "needs triage" || d.status === "ready for grooming"
              ) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => reject(d.id)}
                    disabled={busyId === d.id}
                    className="rounded border border-border px-3 py-1 text-white/70 hover:bg-white/5 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve(d.id)}
                    disabled={busyId === d.id}
                    className="rounded bg-accent px-3 py-1 font-medium text-white disabled:opacity-50"
                  >
                    {busyId === d.id ? "Approving…" : "Approve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
