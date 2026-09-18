"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar, { type Tab } from "@/components/Sidebar";
import StatusBanner from "@/components/StatusBanner";
import OverviewPanel from "@/components/OverviewPanel";
import ChatPanel from "@/components/ChatPanel";
import HealthCheckPanel from "@/components/HealthCheckPanel";
import DraftsPanel from "@/components/DraftsPanel";
import FeedbackCapturePanel from "@/components/FeedbackCapturePanel";
import ConnectorPanel from "@/components/ConnectorPanel";
import StudioPanel from "@/components/StudioPanel";

export default function Home() {
  const [tab, setTab] = useState<Tab>("overview");

  function renderPanel() {
    switch (tab) {
      case "overview":
        return <OverviewPanel onNavigate={setTab} />;
      case "chat":
        return <ChatPanel />;
      case "health":
        return <HealthCheckPanel />;
      case "drafts":
        return <DraftsPanel />;
      case "studio":
        return <StudioPanel />;
      case "feedback":
        return <FeedbackCapturePanel />;
      case "connector":
        return <ConnectorPanel />;
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <StatusBanner onConfigure={() => setTab("connector")} />
      <div className="flex min-h-0 flex-1">
        <Sidebar active={tab} onChange={setTab} />
        <main className="min-h-0 flex-1 overflow-hidden bg-bg">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="h-full"
          >
            {renderPanel()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
