"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, LayoutGrid, MessageSquare, Activity, Inbox, Wand2, MessageSquarePlus, Plug, Sparkles, UserCircle2, GitBranch } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AccountModal from "./AccountModal";

export type Tab = "overview" | "chat" | "health" | "drafts" | "studio" | "feedback" | "connector" | "dashboards" | "repoActivity";

const ITEMS: { id: Tab; label: string; hint: string; icon: typeof MessageSquare }[] = [
  { id: "overview", label: "Overview", hint: "Your backlog at a glance", icon: LayoutDashboard },
  { id: "chat", label: "Chat", hint: "Ask questions across Jira", icon: MessageSquare },
  { id: "studio", label: "Studio", hint: "Draft stories, PRDs, BRDs", icon: Wand2 },
  { id: "dashboards", label: "Dashboards", hint: "Live status & trend widgets", icon: LayoutGrid },
  { id: "repoActivity", label: "Repo Activity", hint: "Daily commits & PRs by dev", icon: GitBranch },
  { id: "health", label: "Health Check", hint: "Epic / sprint report", icon: Activity },
  { id: "drafts", label: "Drafts", hint: "Pending PM approval", icon: Inbox },
  { id: "feedback", label: "Feedback Capture", hint: "Turn a note into a draft", icon: MessageSquarePlus },
  { id: "connector", label: "Connector", hint: "Connect Jira + Gemini + GitHub", icon: Plug },
];

export default function Sidebar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const [status, setStatus] = useState<{ jiraConfigured: boolean; geminiConfigured: boolean; githubConfigured: boolean } | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [active]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.username ?? null))
      .catch(() => {});
  }, []);

  return (
    <nav className="glass flex w-64 shrink-0 flex-col border-r border-fg/[0.06] p-3">
      <div className="mb-5 flex items-center gap-2 px-2 pt-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-white shadow-lg shadow-accent/20">
          <Sparkles size={16} strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold tracking-tight text-fg">AI PM Agent</div>
          <div className="text-[11px] text-fg/40">Jira + Gemini</div>
        </div>
        <ThemeToggle />
      </div>
      <ul className="space-y-1">
        {ITEMS.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id} className="relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-accent/15 ring-1 ring-accent/30"
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                />
              )}
              <button
                onClick={() => onChange(item.id)}
                className={`btn relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                  isActive ? "text-fg" : "text-fg/60 hover:text-fg/90"
                }`}
              >
                <Icon size={17} strokeWidth={2} className={isActive ? "text-accent" : "text-fg/40"} />
                <div>
                  <div className="font-medium leading-tight">{item.label}</div>
                  <div className="text-[11px] leading-tight text-fg/40">{item.hint}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-1">
        <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] text-fg/40">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${status?.jiraConfigured ? "bg-emerald-400" : "bg-fg/20"}`}
            />
            Jira
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${status?.geminiConfigured ? "bg-emerald-400" : "bg-fg/20"}`}
            />
            Gemini
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${status?.githubConfigured ? "bg-emerald-400" : "bg-fg/20"}`}
            />
            GitHub
          </span>
        </div>
        {username && (
          <button
            onClick={() => setAccountOpen(true)}
            className="btn flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg/70 hover:bg-fg/5 hover:text-fg/90"
          >
            <UserCircle2 size={17} className="text-fg/40" />
            <span className="truncate font-medium">{username}</span>
          </button>
        )}
      </div>
      {accountOpen && username && (
        <AccountModal username={username} onClose={() => setAccountOpen(false)} />
      )}
    </nav>
  );
}
