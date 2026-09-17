"use client";

export type Tab = "chat" | "health" | "drafts" | "feedback" | "connector";

const ITEMS: { id: Tab; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "Ask questions across Jira" },
  { id: "health", label: "Health Check", hint: "Epic / sprint report" },
  { id: "drafts", label: "Drafts", hint: "Pending PM approval" },
  { id: "feedback", label: "Feedback Capture", hint: "Turn a note into a draft" },
  { id: "connector", label: "Connector", hint: "Connect Jira + Gemini" },
];

export default function Sidebar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="w-60 shrink-0 border-r border-border bg-panel p-3">
      <div className="mb-4 px-2">
        <div className="text-sm font-semibold tracking-wide text-white">AI PM Agent</div>
        <div className="text-xs text-white/40">Jira + Gemini</div>
      </div>
      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onChange(item.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                active === item.id
                  ? "bg-accent/15 text-accent"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-white/40">{item.hint}</div>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
