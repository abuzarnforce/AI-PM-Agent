"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Sparkles,
  FolderKanban,
  HeartPulse,
  PenTool,
  MessagesSquare,
  Inbox,
  History,
  Cable,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Tab } from "@/lib/nav";
import ThemeToggle from "./ThemeToggle";
import AccountModal from "./AccountModal";
import { Logo } from "./IntelligenceLayer";

export const NAV: { id: Tab; label: string; icon: LucideIcon; key: string; hint: string }[] = [
  { id: "home", label: "Home", icon: Home, key: "h", hint: "What changed today" },
  { id: "agent", label: "AI Agent", icon: Sparkles, key: "a", hint: "Ask your product anything" },
  { id: "projects", label: "Projects", icon: FolderKanban, key: "p", hint: "Live delivery by project" },
  { id: "health", label: "Health", icon: HeartPulse, key: "e", hint: "Epic, sprint and QA health" },
  { id: "studio", label: "Studio", icon: PenTool, key: "s", hint: "Stories, PRDs, BRDs" },
  { id: "feedback", label: "Feedback", icon: MessagesSquare, key: "f", hint: "Turn feedback into work" },
  { id: "drafts", label: "Drafts", icon: Inbox, key: "d", hint: "Awaiting your review" },
  { id: "activity", label: "Activity", icon: History, key: "y", hint: "What PM Agent did" },
  { id: "connections", label: "Connections", icon: Cable, key: "c", hint: "Jira, Gemini, GitHub" },
];

export interface AppStatus {
  jiraConfigured: boolean;
  geminiConfigured: boolean;
  githubConfigured: boolean;
  jiraBaseUrl: string | null;
}

export default function Sidebar({
  active,
  onChange,
  collapsed,
  onToggleCollapsed,
  onOpenPalette,
  status,
  pendingDrafts,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onOpenPalette: () => void;
  status: AppStatus | null;
  pendingDrafts: number;
}) {
  const [username, setUsername] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.username ?? null))
      .catch(() => {});
  }, []);

  const workspace = status?.jiraBaseUrl ? new URL(status.jiraBaseUrl).hostname.replace(".atlassian.net", "") : null;
  const conns = [
    { label: "Jira", on: status?.jiraConfigured },
    { label: "Gemini", on: status?.geminiConfigured },
    { label: "GitHub", on: status?.githubConfigured },
  ];

  return (
    <nav
      aria-label="Primary"
      className={`flex h-full shrink-0 flex-col border-r border-border bg-bg transition-[width] duration-200 ease-out ${
        collapsed ? "w-[60px] px-2" : "w-60 px-3"
      } py-3`}
    >
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "gap-2.5 px-1.5"}`}>
        <Logo />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight">PM Agent</div>
            <div className="truncate text-[11px] text-subtle" title={status?.jiraBaseUrl ?? undefined}>
              {workspace ?? "No workspace connected"}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onOpenPalette}
        aria-label="Search or run a command"
        title="Search or run a command (Ctrl+K)"
        className={`btn mb-4 flex h-8 items-center rounded-md border border-border bg-panel text-[13px] text-muted hover:text-fg ${
          collapsed ? "justify-center" : "gap-2 px-2.5"
        }`}
      >
        <Search size={14} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Search…</span>
            <kbd>Ctrl K</kbd>
          </>
        )}
      </button>

      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          const badge = item.id === "drafts" && pendingDrafts > 0 ? pendingDrafts : null;
          return (
            <li key={item.id} className="relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-fg/[0.06]"
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                />
              )}
              <button
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? `${item.label} (G then ${item.key.toUpperCase()})` : `${item.hint} · G then ${item.key.toUpperCase()}`}
                className={`btn relative flex h-8 w-full items-center rounded-md text-sm ${
                  collapsed ? "justify-center" : "gap-2.5 px-2.5"
                } ${isActive ? "font-medium text-fg" : "text-muted hover:bg-fg/[0.03] hover:text-fg"}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.9} className={isActive ? "text-fg" : ""} />
                {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                {badge != null &&
                  (collapsed ? (
                    <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-label={`${badge} awaiting review`} />
                  ) : (
                    <span className="tabular rounded bg-accent/10 px-1.5 text-[11px] font-semibold text-accent">{badge}</span>
                  ))}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-1 pt-4">
        {!collapsed && (
          <button
            onClick={() => onChange("connections")}
            className="btn flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-[11px] text-subtle hover:text-muted"
            title="Connection status"
          >
            {conns.map((c) => (
              <span key={c.label} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${c.on ? "bg-emerald-400" : "bg-fg/20"}`} />
                {c.label}
              </span>
            ))}
          </button>
        )}
        <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "gap-1"}`}>
          {username && (
            <button
              onClick={() => setAccountOpen(true)}
              title="Account & settings"
              className={`btn flex min-w-0 items-center rounded-md text-left text-sm hover:bg-fg/[0.04] ${
                collapsed ? "h-8 w-8 justify-center" : "h-9 flex-1 gap-2 px-1.5"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fg/10 text-[11px] font-semibold uppercase">
                {username.slice(0, 1)}
              </span>
              {!collapsed && <span className="truncate font-medium">{username}</span>}
            </button>
          )}
          <ThemeToggle />
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
              className="btn flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-fg/5 hover:text-fg"
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          )}
        </div>
      </div>
      {accountOpen && username && <AccountModal username={username} onClose={() => setAccountOpen(false)} />}
    </nav>
  );
}

const MOBILE_TABS: Tab[] = ["home", "agent", "projects", "drafts"];

export function MobileNav({
  active,
  onChange,
  onMore,
  pendingDrafts,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  onMore: () => void;
  pendingDrafts: number;
}) {
  return (
    <nav aria-label="Primary" className="glass fixed inset-x-0 bottom-0 z-30 flex border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      {MOBILE_TABS.map((id) => {
        const item = NAV.find((n) => n.id === id)!;
        const Icon = item.icon;
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${isActive ? "text-fg" : "text-muted"}`}
          >
            <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            {item.label}
            {id === "drafts" && pendingDrafts > 0 && <span className="absolute right-[30%] top-2 h-1.5 w-1.5 rounded-full bg-accent" />}
          </button>
        );
      })}
      <button onClick={onMore} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
        <Menu size={19} strokeWidth={1.8} />
        More
      </button>
    </nav>
  );
}
