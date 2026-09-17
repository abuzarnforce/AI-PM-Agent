"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ExternalLink, FileText, ScrollText, Briefcase, RefreshCw } from "lucide-react";

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

const KIND_ICON: Record<string, typeof FileText> = {
  new_story: FileText,
  update_story: FileText,
  prd: ScrollText,
  brd: Briefcase,
};

const KIND_LABEL: Record<string, string> = {
  new_story: "User Story",
  update_story: "Story Update",
  prd: "PRD",
  brd: "BRD",
};

export default function DraftsPanel() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/drafts");
    const data = await res.json();
    setDrafts(data.drafts ?? []);
    setLoading(false);
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
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Drafts</h1>
            <p className="text-sm text-white/50">
              Nothing is written to Jira until you approve it here (Hard Rule 1).
            </p>
          </div>
          <button onClick={load} className="btn rounded-md p-2 text-white/40 hover:bg-white/5 hover:text-white/70">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4">
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
        {!loading && drafts.length === 0 && (
          <div className="py-10 text-center text-sm text-white/30">No drafts yet.</div>
        )}
        <AnimatePresence>
          {drafts.map((d, i) => {
            const Icon = KIND_ICON[d.kind] ?? FileText;
            const canDecide = !d.result && (d.status === "needs triage" || d.status === "ready for grooming");
            return (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: i * 0.03 }}
                className="card-surface rounded-xl p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-white/40" />
                    <span className="font-medium">{d.title}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/40">
                      {KIND_LABEL[d.kind] ?? d.kind}
                    </span>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}>
                    {d.status}
                  </span>
                </div>
                <pre className="mb-2 whitespace-pre-wrap rounded-lg bg-bg p-3 text-xs text-white/80">{d.body}</pre>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Source: {d.source}</span>
                  {d.result ? (
                    <a
                      href={d.result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline"
                    >
                      {d.result.key}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    canDecide && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => reject(d.id)}
                          disabled={busyId === d.id}
                          className="btn flex items-center gap-1 rounded border border-white/10 px-3 py-1 text-white/70 hover:bg-white/5 disabled:opacity-50"
                        >
                          <X size={12} />
                          Reject
                        </button>
                        <button
                          onClick={() => approve(d.id)}
                          disabled={busyId === d.id}
                          className="btn flex items-center gap-1 rounded bg-accent px-3 py-1 font-medium text-white disabled:opacity-50"
                        >
                          <Check size={12} />
                          {busyId === d.id ? "Approving…" : "Approve"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
