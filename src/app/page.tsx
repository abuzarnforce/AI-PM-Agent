"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar, { type Tab } from "@/components/Sidebar";
import StatusBanner from "@/components/StatusBanner";
import ChatPanel from "@/components/ChatPanel";
import HealthCheckPanel from "@/components/HealthCheckPanel";
import DraftsPanel from "@/components/DraftsPanel";
import FeedbackCapturePanel from "@/components/FeedbackCapturePanel";
import ConnectorPanel from "@/components/ConnectorPanel";
import StudioPanel from "@/components/StudioPanel";

const PANELS: Record<Tab, React.ComponentType> = {
  chat: ChatPanel,
  health: HealthCheckPanel,
  drafts: DraftsPanel,
  studio: StudioPanel,
  feedback: FeedbackCapturePanel,
  connector: ConnectorPanel,
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("chat");
  const ActivePanel = PANELS[tab];

  return (
    <div className="flex h-screen flex-col">
      <StatusBanner onConfigure={() => setTab("connector")} />
      <div className="flex min-h-0 flex-1">
        <Sidebar active={tab} onChange={setTab} />
        <main className="min-h-0 flex-1 overflow-hidden bg-bg">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="h-full"
            >
              <ActivePanel />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
