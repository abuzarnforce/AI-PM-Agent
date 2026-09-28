"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { AppStatus } from "./Sidebar";

export default function StatusBanner({ status, onConfigure }: { status: AppStatus | null; onConfigure: () => void }) {
  const aiName = status?.aiProvider || "NVIDIA";
  const missing = status ? [!status.jiraConfigured && "Jira", !status.geminiConfigured && aiName].filter(Boolean) : [];

  return (
    <AnimatePresence initial={false}>
      {missing.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-panel px-4 py-2 text-[13px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
            <span>{missing.join(" and ")} {missing.length > 1 ? "aren't" : "isn't"} connected yet — some answers will be unavailable.</span>
            <button onClick={onConfigure} className="inline-flex items-center gap-1 font-medium text-fg hover:text-accent">
              Connect <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
