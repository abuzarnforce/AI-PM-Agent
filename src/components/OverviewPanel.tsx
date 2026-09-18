"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Activity,
  Inbox,
  Wand2,
  MessageSquarePlus,
  ArrowRight,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import type { Tab } from "./Sidebar";

interface Draft {
  id: string;
  kind: string;
  status: string;
  title: string;
  source: string;
  createdAt: string;
}

const QUICK_ACTIONS: { tab: Tab; label: string; hint: string; icon: typeof MessageSquare }[] = [
  { tab: "chat", label: "Ask a question", hint: "Chat with your backlog", icon: MessageSquare },
  { tab: "studio", label: "Draft something", hint: "Story, PRD, or BRD", icon: Wand2 },
  { tab: "health", label: "Run a health check", hint: "Epic or sprint report", icon: Activity },
  { tab: "feedback", label: "Capture feedback", hint: "Turn a note into a draft", icon: MessageSquarePlus },
];

const STATUS_DOT: Record<string, string> = {
  "needs triage": "bg-amber-400",
  "ready for grooming": "bg-sky-400",
  approved: "bg-emerald-400",
  rejected: "bg-white/30",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPanel({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [jiraConnected, setJiraConnected] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState(false);

  useEffect(() => {
    fetch("/api/drafts")
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts ?? []));
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => {
        setJiraConnected(s.jiraConfigured);
        setGeminiConnected(s.geminiConfigured);
      });
  }, []);

  const needsTriage = drafts.filter((d) => d.status === "needs triage").length;
  const approved = drafts.filter((d) => d.status === "approved").length;
  const recent = drafts.slice(0, 4);

  const STATS = [
    { label: "Needs triage", value: needsTriage, icon: Clock3, tone: "text-amber-300" },
    { label: "Approved", value: approved, icon: CheckCircle2, tone: "text-emerald-300" },
    { label: "Total drafts", value: drafts.length, icon: Inbox, tone: "text-white/70" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        >
          <div className="text-display">{greeting()}.</div>
          <p className="mt-1 text-white/50">Here's where your backlog and drafts stand right now.</p>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: i * 0.05 }}
                className="card-surface rounded-2xl p-4"
              >
                <Icon size={16} className={s.tone} />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</div>
                <div className="text-xs text-white/40">{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10">
          <div className="mb-3 text-sm font-medium text-white/50">Quick actions</div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.15 + i * 0.04 }}
                  whileHover={{ y: -2 }}
                  onClick={() => onNavigate(a.tab)}
                  className="btn card-surface group flex items-center gap-3 rounded-2xl p-4 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-white/40">{a.hint}</div>
                  </div>
                  <ArrowRight
                    size={15}
                    className="shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50"
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-white/50">Recent drafts</div>
            <button onClick={() => onNavigate("drafts")} className="btn text-xs text-accent hover:underline">
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="card-surface rounded-2xl p-6 text-center text-sm text-white/30">
              Nothing drafted yet — try Studio or Feedback Capture.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.25 + i * 0.04 }}
                  className="card-surface flex items-center gap-3 rounded-xl px-4 py-3"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[d.status]}`} />
                  <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                  <span className="shrink-0 text-xs text-white/30">{d.status}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {(!jiraConnected || !geminiConnected) && (
          <motion.button
            onClick={() => onNavigate("connector")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="btn mt-10 w-full rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-white/40 hover:border-accent/40 hover:text-white/70"
          >
            {!jiraConnected && !geminiConnected
              ? "Connect Jira and Gemini to get started →"
              : !jiraConnected
              ? "Connect Jira to unlock Chat, Health Check, and duplicate detection →"
              : "Connect Gemini to unlock generation and reasoning →"}
          </motion.button>
        )}
      </div>
    </div>
  );
}
