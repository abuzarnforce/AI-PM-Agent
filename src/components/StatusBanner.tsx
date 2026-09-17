"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function StatusBanner({ onConfigure }: { onConfigure: () => void }) {
  const [status, setStatus] = useState<{ jiraConfigured: boolean; geminiConfigured: boolean } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ jiraConfigured: false, geminiConfigured: false }));
  }, []);

  const show = status && (!status.jiraConfigured || !status.geminiConfigured);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            <AlertTriangle size={14} className="shrink-0" />
            {!status!.geminiConfigured && <span>Gemini not connected</span>}
            {!status!.jiraConfigured && <span>Jira not connected</span>}
            <button onClick={onConfigure} className="btn ml-1 rounded px-2 py-0.5 font-medium text-amber-200 underline decoration-amber-500/40 underline-offset-2 hover:bg-amber-500/10">
              Connect in the Connector tab
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
