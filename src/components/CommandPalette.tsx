"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CornerDownLeft, FileText, HeartPulse, Inbox, MessagesSquare, PenTool, Search, Sparkles, Upload, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavIntent, Tab } from "@/lib/nav";
import { readActivity } from "@/lib/activity";
import { NAV } from "./Sidebar";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

const TICKET_RE = /^[A-Za-z][A-Za-z0-9]+-\d+$/;

export default function CommandPalette({
  open,
  onClose,
  navigate,
  jiraBaseUrl,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (tab: Tab, intent?: NavIntent) => void;
  jiraBaseUrl: string | null;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [drafts, setDrafts] = useState<{ id: string; title: string; status: string }[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    setRecent([...new Set(readActivity().filter((e) => e.kind === "agent").map((e) => e.detail ?? ""))].filter(Boolean).slice(0, 4));
    fetch("/api/drafts")
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts ?? []))
      .catch(() => {});
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (tab: Tab, intent?: NavIntent) => () => {
      navigate(tab, intent);
      onClose();
    };
    const query = q.trim();
    const lower = query.toLowerCase();
    const match = (s: string) => !lower || s.toLowerCase().includes(lower);
    const out: Item[] = [];

    if (query) {
      out.push({ id: "ask", group: "PM Agent", label: `Ask PM Agent: “${query}”`, icon: Sparkles, run: go("agent", { question: query }) });
      if (TICKET_RE.test(query) && jiraBaseUrl) {
        const key = query.toUpperCase();
        out.push({
          id: "ticket",
          group: "Jira",
          label: `Open ${key} in Jira`,
          icon: ArrowUpRight,
          run: () => {
            window.open(`${jiraBaseUrl}/browse/${key}`, "_blank", "noopener");
            onClose();
          },
        });
      }
      out.push({
        id: "jira-search",
        group: "Jira",
        label: `Search Jira for “${query}”`,
        icon: Search,
        run: go("agent", { question: `Find Jira issues about: ${query}` }),
      });
    }

    const actions: Omit<Item, "group">[] = [
      { id: "a-ask", label: "Ask PM Agent", icon: Sparkles, run: go("agent") },
      { id: "a-blockers", label: "View blockers", hint: "Ask the agent", icon: Sparkles, run: go("agent", { question: "What's currently blocked or flagged as a blocker?" }) },
      { id: "a-story", label: "Create user story", icon: PenTool, run: go("studio", { studioKind: "user_story" }) },
      { id: "a-prd", label: "Generate PRD", icon: FileText, run: go("studio", { studioKind: "prd" }) },
      { id: "a-brd", label: "Generate BRD", icon: FileText, run: go("studio", { studioKind: "brd" }) },
      { id: "a-sprint", label: "Open sprint health", icon: HeartPulse, run: go("health", { subtab: "check" }) },
      { id: "a-qa", label: "Upload QA file", icon: Upload, run: go("health", { subtab: "qa" }) },
      { id: "a-feedback", label: "Capture feedback", icon: MessagesSquare, run: go("feedback") },
      { id: "a-drafts", label: "Open drafts", icon: Inbox, run: go("drafts") },
    ];
    out.push(...actions.filter((a) => match(a.label)).map((a) => ({ ...a, group: "Actions" })));

    if (!query) {
      out.push(...recent.map((r, i) => ({ id: `r-${i}`, group: "Recent questions", label: r, icon: History, run: go("agent", { question: r }) })));
    }

    out.push(
      ...NAV.filter((n) => match(n.label)).map((n) => ({
        id: `nav-${n.id}`,
        group: "Go to",
        label: n.label,
        hint: `G ${n.key.toUpperCase()}`,
        icon: n.icon,
        run: go(n.id),
      }))
    );

    if (query) {
      out.push(
        ...drafts
          .filter((d) => match(d.title))
          .slice(0, 6)
          .map((d) => ({ id: `d-${d.id}`, group: "Drafts", label: d.title, hint: d.status, icon: Inbox, run: go("drafts", { subtab: d.id }) }))
      );
    }
    return out;
  }, [q, drafts, recent, jiraBaseUrl, navigate, onClose]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[sel]?.run();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (typeof document === "undefined") return null;

  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            onMouseDown={(e) => e.stopPropagation()}
            className="overlay-surface w-full max-w-xl overflow-hidden rounded-xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={items[sel] ? `palette-${items[sel].id}` : undefined}
                placeholder="Ask, search Jira, or jump to…"
                className="h-12 flex-1 !border-0 !bg-transparent px-0 text-[15px] !shadow-none"
              />
              <kbd>Esc</kbd>
            </div>
            <div ref={listRef} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted">No matches.</div>}
              {items.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const Icon = it.icon;
                return (
                  <div key={it.id}>
                    {header && <div className="px-2.5 pb-1 pt-3 text-[11px] font-medium text-subtle first:pt-1">{header}</div>}
                    <div
                      id={`palette-${it.id}`}
                      role="option"
                      aria-selected={i === sel}
                      data-idx={i}
                      onMouseMove={() => setSel(i)}
                      onClick={it.run}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm ${i === sel ? "bg-fg/[0.06] text-fg" : "text-fg/80"}`}
                    >
                      <Icon size={15} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                      {it.hint && <span className="shrink-0 text-xs text-subtle">{it.hint}</span>}
                      {i === sel && <CornerDownLeft size={13} className="shrink-0 text-subtle" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
