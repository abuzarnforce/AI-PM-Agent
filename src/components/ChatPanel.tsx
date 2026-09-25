"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Copy, Check, PenTool, CornerDownRight, ChevronRight, FolderKanban } from "lucide-react";
import { useJiraBaseUrl, jiraTicketUrl, linkifyTicketKeys } from "@/lib/useJiraBaseUrl";
import { useNav } from "@/lib/nav";
import { getLastProject, logActivity, setLastProject } from "@/lib/activity";
import { Button, ErrorState, SourceChip, WorkingState } from "./ui";
import { Logo } from "./IntelligenceLayer";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
  sources?: string[];
  jql?: string;
  resultCount?: number;
}

const PROMPTS = [
  "What's blocking this sprint?",
  "Summarize this week's progress.",
  "What changed since Monday?",
  "Which bugs are open and high priority?",
  "Find possible duplicate stories.",
  "Prepare my stakeholder update.",
  "Which tickets haven't moved in two weeks?",
  "Analyze the current sprint.",
];

/** These are the real stages of /api/chat: JQL generation, Jira search, answer. */
const STEPS = ["Understanding your question…", "Searching Jira…", "Reading matching issues…", "Preparing your answer…"];

export default function ChatPanel() {
  const { intent, navigate } = useNav();
  const [projectKey, setProjectKey] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const jiraBaseUrl = useJiraBaseUrl();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const scope = getLastProject();
    setProjectKey(scope);
    if (intent?.question && !started.current) {
      started.current = true;
      ask(intent.question, { echo: true }, scope);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(text: string, opts: { echo: boolean } = { echo: true }, scope = projectKey) {
    if (!text || loading) return;
    if (opts.echo) setMessages((m) => [...m, { role: "user", text }]);
    setLastQuestion(text);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, projectKey: scope.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", text: data.answer, sources: data.sources, jql: data.jql, resultCount: data.resultCount }]);
      logActivity("agent", `Answered “${text}” from ${data.resultCount ?? 0} Jira issues`, text);
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
    if (projectKey.trim()) setLastProject(projectKey.trim().toUpperCase());
    ask(text);
  }

  const empty = messages.length === 0 && !loading;

  const composer = (
    <div className="rounded-xl border border-border bg-panel p-2 shadow-[var(--surface-shadow)] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15">
      <textarea
        ref={inputRef}
        value={input}
        rows={empty ? 2 : 1}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        aria-label="Ask PM Agent"
        placeholder={empty ? "What would you like to know?" : "Ask a follow-up…"}
        className="block w-full resize-none !border-0 !bg-transparent px-2 py-1.5 text-[15px] !shadow-none"
      />
      <div className="mt-1 flex items-center gap-2 pl-1">
        <label className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-fg/[0.04]" title="Scope answers to one Jira project">
          <FolderKanban size={13} />
          <input
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            placeholder="All projects"
            aria-label="Project key"
            className="!min-h-0 w-24 !border-0 !bg-transparent p-0 text-xs uppercase !shadow-none placeholder:normal-case"
          />
        </label>
        <span className="ml-auto hidden text-[11px] text-subtle sm:block">Enter to send · Shift+Enter for a new line</span>
        <Button variant="primary" size="sm" onClick={send} disabled={loading || !input.trim()} aria-label="Send" icon={ArrowUp} />
      </div>
    </div>
  );

  if (empty) {
    return (
      <div className="page flex min-h-[calc(100dvh-4rem)] flex-col justify-center">
        <div className="mx-auto w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Logo size={36} />
            <h1 className="text-display mt-6">Ask your product anything.</h1>
            <p className="mt-3 text-lg text-muted">Answers come from your live Jira data, with every ticket cited.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-8">
            {composer}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="mt-6 grid gap-x-6 sm:grid-cols-2"
          >
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => ask(p)}
                className="group flex items-center gap-2 border-b border-border py-2.5 text-left text-sm text-muted hover:text-fg"
              >
                <CornerDownRight size={13} className="shrink-0 text-subtle group-hover:text-accent" />
                {p}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col md:min-h-[100dvh]">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 pb-8 pt-10 sm:px-6">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl bg-fg/[0.06] px-4 py-2.5 text-[15px]">{m.text}</div>
                </div>
              ) : m.role === "error" ? (
                <ErrorState message={m.text} onRetry={lastQuestion ? () => ask(lastQuestion, { echo: false }) : undefined} />
              ) : (
                <Answer
                  m={m}
                  jiraBaseUrl={jiraBaseUrl}
                  onFollowUp={() => inputRef.current?.focus()}
                  onDraft={() => navigate("studio", { studioKind: "user_story", brief: m.text })}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3">
            <Logo size={24} />
            <WorkingState steps={STEPS} interval={1800} />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="glass sticky bottom-16 border-t border-border px-4 py-3 sm:px-6 md:bottom-0">
        <div className="mx-auto max-w-3xl">{composer}</div>
      </div>
    </div>
  );
}

function Answer({
  m,
  jiraBaseUrl,
  onFollowUp,
  onDraft,
}: {
  m: Message;
  jiraBaseUrl: string | null;
  onFollowUp: () => void;
  onDraft: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showJql, setShowJql] = useState(false);
  return (
    <div className="flex gap-3">
      <Logo size={24} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="font-medium text-fg">PM Agent</span>
          {m.resultCount != null && <span>· searched {m.resultCount} Jira issue{m.resultCount === 1 ? "" : "s"}</span>}
          {m.jql && (
            <button onClick={() => setShowJql((s) => !s)} className="inline-flex items-center gap-0.5 hover:text-fg" aria-expanded={showJql}>
              · how I searched
              <ChevronRight size={12} className={`transition-transform ${showJql ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>
        {showJql && <code className="mt-2 block rounded-md border border-border bg-panel px-3 py-2 font-mono text-xs text-muted">{m.jql}</code>}

        <FormattedAnswer text={m.text} jiraBaseUrl={jiraBaseUrl} />

        {m.sources && m.sources.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-medium text-subtle">Sources</div>
            <div className="flex flex-wrap gap-1.5">
              {m.sources.map((s) => (
                <SourceChip key={s} kind="Jira" label={s} href={jiraTicketUrl(jiraBaseUrl, s)} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1">
          <Button size="sm" variant="ghost" icon={CornerDownRight} onClick={onFollowUp}>
            Ask follow-up
          </Button>
          <Button size="sm" variant="ghost" icon={PenTool} onClick={onDraft}>
            Draft a story
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? Check : Copy}
            onClick={() => {
              navigator.clipboard.writeText(m.text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <span className="ml-auto text-[11px] text-subtle">AI-generated from Jira — verify before acting.</span>
        </div>
      </div>
    </div>
  );
}

const LIST_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Light structure for plain-text answers: paragraphs and lists, ticket keys linked. */
function FormattedAnswer({ text, jiraBaseUrl }: { text: string; jiraBaseUrl: string | null }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="mt-2 space-y-3 text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (lines.length > 0 && lines.every((l) => LIST_RE.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-1.5 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-subtle`}>
              {lines.map((l, j) => (
                <li key={j}>{linkifyTicketKeys(l.replace(LIST_RE, ""), jiraBaseUrl)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {linkifyTicketKeys(b, jiraBaseUrl)}
          </p>
        );
      })}
    </div>
  );
}
