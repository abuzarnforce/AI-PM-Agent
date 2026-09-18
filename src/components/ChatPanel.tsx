"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, RotateCcw, Sparkles } from "lucide-react";

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
      <div className="border-b border-white/[0.06] p-4">
        <h1 className="text-panel-title">Chat</h1>
        <p className="text-sm text-white/50">Ask a free-form question. Answers cite Jira ticket keys.</p>
        <input
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value)}
          placeholder="Optional: scope to project key (e.g. ONEHR)"
          className="mt-2 w-72 rounded-md border border-white/10 bg-panel px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-white/30">
            <Sparkles size={22} className="text-white/15" />
            <div>Try: "What's blocking the login epic?" or "List open bugs assigned to me."</div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={`max-w-2xl rounded-xl border px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-auto border-accent/30 bg-accent/10"
                  : m.role === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "card-surface"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.role === "error" && (
                <button
                  onClick={retry}
                  disabled={loading}
                  className="btn mt-2 flex items-center gap-1.5 rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <RotateCcw size={12} />
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
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-sm text-white/40"
          >
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
            Thinking…
          </motion.div>
        )}
      </div>

      <div className="glass border-t border-white/[0.06] p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your backlog…"
            className="flex-1 rounded-lg border border-white/10 bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            onClick={send}
            disabled={loading}
            className="btn flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
