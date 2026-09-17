"use client";

import { useEffect, useState } from "react";

export default function StatusBanner() {
  const [status, setStatus] = useState<{ jiraConfigured: boolean; geminiConfigured: boolean } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ jiraConfigured: false, geminiConfigured: false }));
  }, []);

  if (!status || (status.jiraConfigured && status.geminiConfigured)) return null;

  return (
    <div className="border-b border-border bg-[#2a1f14] px-4 py-2 text-sm text-amber-300">
      {!status.geminiConfigured && <span className="mr-4">⚠ GEMINI_API_KEY not set</span>}
      {!status.jiraConfigured && (
        <span>⚠ JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN not set</span>
      )}
      <span className="ml-2 text-amber-400/70">Add them to .env.local and restart the server.</span>
    </div>
  );
}
