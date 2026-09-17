"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
  sources?: string[];
  jql?: string;
}

export default function ChatPanel() {
  const [projectKey, setProjectKey] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  async function ask(text: string, opts: { echo: boolean } = { echo: true }) {
    if (!text || loading) return;
    if (opts.echo) setMessages((m) => [...m, { role: "user", text }]);
    setLastQuestion(text);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, projectKey: projectKey || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", text: data.answer, sources: data.sources, jql: data.jql }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "error", text: err.message ?? "Something went wrong" }]);
    } finally {
      setLoading(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    ask(text);
  }

  function retry() {
    if (lastQuestion) ask(lastQuestion, { echo: false });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Chat</h1>
        <p className="text-sm text-white/50">Ask a free-form question. Answers cite Jira ticket keys.</p>
        <input
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value)}
          placeholder="Optional: scope to project key (e.g. ONEHR)"
          className="mt-2 w-72 rounded-md border border-border bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-sm text-white/40">
            Try: "What's blocking the login epic?" or "List open bugs assigned to me."
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-2xl rounded-lg border px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-auto border-accent/30 bg-accent/10"
                : m.role === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-border bg-panel"
            }`}
          >
            <div className="whitespace-pre-wrap">{m.text}</div>
            {m.role === "error" && (
              <button
                onClick={retry}
                disabled={loading}
                className="mt-2 rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                Retry
              </button>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-white/50">
                Sources:
                {m.sources.map((s) => (
                  <span key={s} className="rounded bg-white/10 px-1.5 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-sm text-white/40">Thinking…</div>}
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your backlog…"
            className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
