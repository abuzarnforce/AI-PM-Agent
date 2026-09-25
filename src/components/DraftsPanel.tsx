"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ExternalLink, Inbox, ArrowLeft, ShieldCheck, RefreshCw } from "lucide-react";
import { useNav } from "@/lib/nav";
import { logActivity } from "@/lib/activity";
import { Badge, Button, EmptyState, ErrorState, PageHeader, Skeleton, Tabs, relativeTime } from "./ui";
import { DraftDocument } from "./DraftDocument";
import { DraftStatus } from "./HomePanel";

interface Draft {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  source: string;
  createdAt: string;
  jiraAction?: { type: "create" | "update"; projectKey?: string; issueType?: string; targetKey?: string };
  result?: { key: string; url: string };
}

const KIND_LABEL: Record<string, string> = { new_story: "User Story", update_story: "Story update", prd: "PRD", brd: "BRD" };

type Filter = "pending" | "approved" | "rejected" | "all";
const isPending = (d: Draft) => !d.result && (d.status === "needs triage" || d.status === "ready for grooming");

export default function DraftsPanel() {
  const { intent } = useNav();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(intent?.subtab ?? null);
  const [mobileDetail, setMobileDetail] = useState(!!intent?.subtab);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // If we were sent to a specific draft that isn't pending, show it anyway.
  useEffect(() => {
    const target = drafts.find((d) => d.id === intent?.subtab);
    if (target && !isPending(target)) setFilter("all");
  }, [drafts, intent?.subtab]);

  const counts = {
    pending: drafts.filter(isPending).length,
    approved: drafts.filter((d) => d.status === "approved").length,
    rejected: drafts.filter((d) => d.status === "rejected").length,
    all: drafts.length,
  };
  const visible = drafts.filter((d) =>
    filter === "all" ? true : filter === "pending" ? isPending(d) : d.status === filter
  );
  const selected = visible.find((d) => d.id === selectedId) ?? visible[0] ?? null;

  return (
    <div className="page !max-w-[84rem]">
      <PageHeader
        eyebrow="Drafts"
        title="Review before anything reaches Jira."
        description="Everything PM Agent writes lands here first. Approve to create or update the Jira issue; reject to discard."
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load} aria-label="Refresh" />}
      >
        <Tabs
          id="drafts"
          active={filter}
          onChange={(f) => {
            setFilter(f);
            setSelectedId(null);
          }}
          tabs={[
            { id: "pending", label: `Awaiting review · ${counts.pending}` },
            { id: "approved", label: `Approved · ${counts.approved}` },
            { id: "rejected", label: `Rejected · ${counts.rejected}` },
            { id: "all", label: "All" },
          ]}
        />
      </PageHeader>

      {loading && drafts.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === "pending" ? "You're all caught up." : "Nothing here yet."}
          description={filter === "pending" ? "Drafts from Studio and Feedback will wait here for your approval." : undefined}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <ul className={`space-y-1 ${mobileDetail ? "hidden lg:block" : ""}`} aria-label="Drafts">
            {visible.map((d) => {
              const on = selected?.id === d.id;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => {
                      setSelectedId(d.id);
                      setMobileDetail(true);
                    }}
                    aria-current={on ? "true" : undefined}
                    className={`w-full rounded-lg border px-3.5 py-3 text-left transition-colors ${
                      on ? "border-border bg-panel" : "border-transparent hover:bg-fg/[0.03]"
                    }`}
                  >
                    <div className="line-clamp-2 text-sm font-medium">{d.title}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                      <span>{KIND_LABEL[d.kind] ?? d.kind}</span>
                      {d.jiraAction?.projectKey && <span>· {d.jiraAction.projectKey}</span>}
                      <span className="ml-auto">{relativeTime(d.createdAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={mobileDetail ? "" : "hidden lg:block"}>
            <button onClick={() => setMobileDetail(false)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted lg:hidden">
              <ArrowLeft size={14} /> All drafts
            </button>
            <AnimatePresence mode="wait">
              {selected && <DraftReview key={selected.id} draft={selected} onChanged={load} />}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftReview({ draft: d, onChanged }: { draft: Draft; onChanged: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = isPending(d);
  const action = d.jiraAction;

  const heading =
    action?.type === "create"
      ? `Create Jira ${action.issueType ?? "issue"}`
      : action?.type === "update"
      ? `Update ${action.targetKey}`
      : `${KIND_LABEL[d.kind] ?? "Document"} draft`;
  const approveLabel = action?.type === "create" ? "Approve & create" : action?.type === "update" ? "Approve & update" : "Approve";
  const consequence =
    action?.type === "create"
      ? `This creates a new ${action.issueType ?? "issue"} in ${action.projectKey}.`
      : action?.type === "update"
      ? `This updates ${action.targetKey} in Jira.`
      : "This marks the draft approved. No Jira issue is created because no project was set.";

  async function decide(kind: "approve" | "reject") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Failed to ${kind}`);
      logActivity("draft", `${kind === "approve" ? "Approved" : "Rejected"} “${d.title}”${data.draft?.result ? ` → ${data.draft.result.key}` : ""}`);
      await onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-xl border border-border bg-panel"
    >
      <header className="border-b border-border p-6">
        <div className="flex flex-wrap items-center gap-2">
          {pending ? (
            <Badge tone="blue" dot>
              Ready for review
            </Badge>
          ) : (
            <DraftStatus status={d.status} />
          )}
          <span className="text-xs text-muted">{heading}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{d.title}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          {[
            ["Type", KIND_LABEL[d.kind] ?? d.kind],
            ["Project", action?.projectKey ?? action?.targetKey ?? "—"],
            ["Source", d.source],
            ["Created", new Date(d.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-subtle">{k}</dt>
              <dd className="mt-0.5 truncate" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="p-6 sm:p-8">
        <DraftDocument body={d.body} />
      </div>

      <footer className="border-t border-border bg-bg/50 p-4 sm:px-6">
        {error && (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        )}
        {d.result ? (
          <a href={d.result.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover">
            <Check size={14} /> Created as {d.result.key} <ExternalLink size={13} />
          </a>
        ) : pending ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="shrink-0 text-emerald-400" />
              {confirming ? consequence : "Human approval required. AI-generated — review before publishing."}
            </div>
            <div className="ml-auto flex gap-2">
              {confirming ? (
                <>
                  <Button onClick={() => setConfirming(false)} disabled={!!busy}>
                    Cancel
                  </Button>
                  <Button variant="primary" icon={Check} loading={busy === "approve"} onClick={() => decide("approve")} autoFocus>
                    Confirm
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="danger" icon={X} loading={busy === "reject"} onClick={() => decide("reject")}>
                    Reject
                  </Button>
                  <Button variant="primary" icon={Check} onClick={() => setConfirming(true)}>
                    {approveLabel}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted">This draft was {d.status}.</div>
        )}
      </footer>
    </motion.article>
  );
}
