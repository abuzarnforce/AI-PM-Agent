"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ScrollText, Briefcase, Sparkles } from "lucide-react";

type StudioKind = "user_story" | "prd" | "brd";

const KINDS: { id: StudioKind; label: string; icon: typeof FileText; placeholder: string }[] = [
  {
    id: "user_story",
    label: "User Story",
    icon: FileText,
    placeholder: "e.g. Managers need to bulk-approve leave requests instead of one at a time...",
  },
  {
    id: "prd",
    label: "PRD",
    icon: ScrollText,
    placeholder: "e.g. We want to add SSO login for enterprise customers because...",
  },
  {
    id: "brd",
    label: "BRD",
    icon: Briefcase,
    placeholder: "e.g. Finance needs automated expense-category validation to cut manual review time...",
  },
];

export default function StudioPanel() {
  const [kind, setKind] = useState<StudioKind>("user_story");
  const [brief, setBrief] = useState("");
  const [source, setSource] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const activeKind = KINDS.find((k) => k.id === kind)!;

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          brief,
          source,
          projectKey: kind === "user_story" ? projectKey || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-white/[0.06] p-4">
        <h1 className="text-lg font-semibold tracking-tight">Studio</h1>
        <p className="text-sm text-white/50">
          Draft a User Story, PRD, or BRD from a brief. Everything lands in Drafts as "needs
          triage" — nothing is written to Jira until you approve it.
        </p>

        <div className="relative mt-4 inline-flex rounded-lg border border-white/10 bg-panel p-1">
          {KINDS.map((k) => {
            const isActive = kind === k.id;
            const Icon = k.icon;
            return (
              <button
                key={k.id}
                onClick={() => {
                  setKind(k.id);
                  setResult(null);
                  setError(null);
                }}
                className="btn relative rounded-md px-3.5 py-1.5 text-sm font-medium"
              >
                {isActive && (
                  <motion.div
                    layoutId="studio-kind-pill"
                    className="absolute inset-0 rounded-md bg-accent shadow-sm"
                    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap ${isActive ? "text-white" : "text-white/60"}`}>
                  <Icon size={14} strokeWidth={2.25} />
                  {k.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={activeKind.placeholder}
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-panel px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <div className="flex flex-wrap gap-3">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (meeting note, demo date + stakeholder, etc.)"
            className="w-80 rounded-md border border-white/10 bg-panel px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
          />
          {kind === "user_story" && (
            <input
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              placeholder="Optional: project key for duplicate check"
              className="w-72 rounded-md border border-white/10 bg-panel px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
            />
          )}
          <button
            onClick={generate}
            disabled={loading || !brief.trim() || !source.trim()}
            className="btn flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Sparkles size={14} />
            {loading ? "Generating…" : `Generate ${activeKind.label}`}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}

          {result?.duplicateFound && (
            <motion.div
              key="dup"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
            >
              <div className="mb-2 font-medium text-amber-300">
                Possible duplicate(s) found — surfacing instead of drafting a new story
              </div>
              {result.duplicateCheck.matches.map((m: any) => (
                <div key={m.key} className="mb-1 rounded bg-bg px-3 py-2">
                  <span className="font-medium">{m.key}</span> ({m.confidence}) — {m.summary}
                  <div className="text-white/50">{m.reason}</div>
                </div>
              ))}
            </motion.div>
          )}

          {result?.draft && (
            <motion.div
              key="draft"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="card-surface rounded-lg p-4 text-sm"
            >
              <div className="mb-2 font-medium text-emerald-300">
                Draft created — tagged "needs triage"
              </div>
              <pre className="whitespace-pre-wrap rounded bg-bg p-3 text-xs text-white/80">
                {result.draft.body}
              </pre>
              <div className="mt-2 text-white/50">See the Drafts tab to approve or reject.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
