"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar, { MobileNav, NAV, type AppStatus } from "@/components/Sidebar";
import StatusBanner from "@/components/StatusBanner";
import CommandPalette from "@/components/CommandPalette";
import HomePanel from "@/components/HomePanel";
import ChatPanel from "@/components/ChatPanel";
import StandupPanel from "@/components/StandupPanel";
import HealthCheckPanel from "@/components/HealthCheckPanel";
import DraftsPanel from "@/components/DraftsPanel";
import FeedbackCapturePanel from "@/components/FeedbackCapturePanel";
import ConnectorPanel from "@/components/ConnectorPanel";
import StudioPanel from "@/components/StudioPanel";
import DashboardsPanel from "@/components/DashboardsPanel";
import ActivityPanel from "@/components/ActivityPanel";
import { NavContext, type NavIntent, type Tab } from "@/lib/nav";

const PANELS: Record<Tab, () => JSX.Element> = {
  home: () => <HomePanel />,
  agent: () => <ChatPanel />,
  standup: () => <StandupPanel />,
  projects: () => <DashboardsPanel />,
  health: () => <HealthCheckPanel />,
  studio: () => <StudioPanel />,
  feedback: () => <FeedbackCapturePanel />,
  drafts: () => <DraftsPanel />,
  activity: () => <ActivityPanel />,
  connections: () => <ConnectorPanel />,
};

const isTab = (s: string): s is Tab => s in PANELS;

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [intent, setIntent] = useState<NavIntent | null>(null);
  const [navKey, setNavKey] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const gPressed = useRef(0);

  const navigate = useCallback((t: Tab, i?: NavIntent) => {
    setTab(t);
    setIntent(i ?? null);
    setNavKey((k) => k + 1); // remount so a new intent is picked up even on the same tab
    setDrawerOpen(false);
    if (window.location.hash !== `#${t}`) history.pushState(null, "", `#${t}`);
  }, []);

  // Hash routing: deep links and the browser back button.
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      if (isTab(h)) {
        setTab(h);
        setIntent(null);
      }
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pm-agent-sidebar");
      setCollapsed(stored ? stored === "collapsed" : window.innerWidth < 1280);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("pm-agent-sidebar", c ? "expanded" : "collapsed");
      } catch {}
      return !c;
    });
  }

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ jiraConfigured: false, geminiConfigured: false, githubConfigured: false, jiraBaseUrl: null }));
    fetch("/api/drafts")
      .then((r) => r.json())
      .then((d) => setPendingDrafts((d.drafts ?? []).filter((x: any) => !x.result && (x.status === "needs triage" || x.status === "ready for grooming")).length))
      .catch(() => {});
  }, [tab, navKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || paletteOpen) return;
      if (e.key === "[") {
        toggleCollapsed();
        return;
      }
      if (e.key === "g") {
        gPressed.current = Date.now();
        return;
      }
      if (Date.now() - gPressed.current < 1000) {
        const item = NAV.find((n) => n.key === e.key.toLowerCase());
        if (item) navigate(item.id);
        gPressed.current = 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, paletteOpen]);

  const sidebarProps = {
    active: tab,
    onChange: (t: Tab) => navigate(t),
    onOpenPalette: () => setPaletteOpen(true),
    status,
    pendingDrafts,
  };

  return (
    <NavContext.Provider value={{ navigate, intent }}>
      <div className="flex h-[100dvh] flex-col">
        <StatusBanner status={status} onConfigure={() => navigate("connections")} />
        <div className="flex min-h-0 flex-1">
          <div className="hidden md:block">
            <Sidebar {...sidebarProps} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
          </div>
          <main id="main" className="min-h-0 flex-1 overflow-y-auto">
            <motion.div
              key={`${tab}-${navKey}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="min-h-full"
            >
              {PANELS[tab]()}
            </motion.div>
          </main>
        </div>

        <MobileNav active={tab} onChange={(t) => navigate(t)} onMore={() => setDrawerOpen(true)} pendingDrafts={pendingDrafts} />
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setDrawerOpen(false)}
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="h-full w-64"
                onClick={(e) => e.stopPropagation()}
              >
                <Sidebar {...sidebarProps} collapsed={false} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} jiraBaseUrl={status?.jiraBaseUrl ?? null} />
      </div>
    </NavContext.Provider>
  );
}
