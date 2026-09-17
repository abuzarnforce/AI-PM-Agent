"use client";

import { useState } from "react";
import Sidebar, { type Tab } from "@/components/Sidebar";
import StatusBanner from "@/components/StatusBanner";
import ChatPanel from "@/components/ChatPanel";
import HealthCheckPanel from "@/components/HealthCheckPanel";
import DraftsPanel from "@/components/DraftsPanel";
import FeedbackCapturePanel from "@/components/FeedbackCapturePanel";

export default function Home() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="flex h-screen flex-col">
      <StatusBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar active={tab} onChange={setTab} />
        <main className="min-h-0 flex-1 bg-bg">
          {tab === "chat" && <ChatPanel />}
          {tab === "health" && <HealthCheckPanel />}
          {tab === "drafts" && <DraftsPanel />}
          {tab === "feedback" && <FeedbackCapturePanel />}
        </main>
      </div>
    </div>
  );
}
