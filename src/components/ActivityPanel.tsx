"use client";

import { useEffect, useState } from "react";
import { History, Sparkles, HeartPulse, PenTool, MessagesSquare, Inbox, FlaskConical, FolderKanban, GitBranch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNav } from "@/lib/nav";
import { readActivity, type ActivityKind } from "@/lib/activity";
import { EmptyState, FadeIn, PageHeader, Skeleton, Tabs } from "./ui";
import RepoActivityPanel from "./RepoActivityPanel";

const ICON: Record<ActivityKind | "repo", LucideIcon> = {
  agent: Sparkles,
  health: HeartPulse,
  studio: PenTool,
  feedback: MessagesSquare,
  draft: Inbox,
  qa: FlaskConical,
  projects: FolderKanban,
  repo: GitBranch,
};

interface Row {
  at: string;
  kind: ActivityKind | "repo";
  text: string;
  origin: string;
}

export default function ActivityPanel() {
  const { intent } = useNav();
  const [tab, setTab] = useState<"agent" | "repo">(intent?.subtab === "repo" ? "repo" : "agent");
  return (
    <div className="page">
      <PageHeader
        eyebrow="Activity"
        title="What PM Agent has been doing."
        description="Every question answered, check run and draft decided — plus what engineering shipped."
      >
        <Tabs
          id="activity"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "agent", label: "PM Agent" },
            { id: "repo", label: "Repository" },
          ]}
        />
      </PageHeader>
      {tab === "agent" ? <Timeline /> : <RepoActivityPanel />}
    </div>
  );
}

function Timeline() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const local: Row[] = readActivity().map((e) => ({ ...e, origin: "This browser" }));
    Promise.all([
      fetch("/api/drafts").then((r) => r.json()).catch(() => null),
      fetch("/api/qa-sheet").then((r) => r.json()).catch(() => null),
    ]).then(([d, q]) => {
      const server: Row[] = (d?.drafts ?? []).map((x: any) => ({
        at: x.createdAt,
        kind: "draft",
        text: `Drafted “${x.title}”${x.result ? ` — now ${x.result.key}` : x.status !== "needs triage" ? ` — ${x.status}` : ""}`,
        origin: "Drafts",
      }));
      if (q?.snapshot) server.push({ at: q.snapshot.uploadedAt, kind: "qa", text: `QA sheet ${q.snapshot.sourceFileName} became the active QA source`, origin: "QA sheet" });
      // Local "drafted" events duplicate server drafts; keep the server copy.
      const merged = [...server, ...local.filter((l) => !/^Drafted |^Turned feedback into draft/.test(l.text))];
      setRows(merged.sort((a, b) => (a.at < b.at ? 1 : -1)));
    });
  }, []);

  if (!rows) return <Skeleton className="h-48 w-full" />;
  if (rows.length === 0)
    return <EmptyState icon={History} title="Nothing yet." description="Ask the Agent a question or run a health check and it will show up here." />;

  const byDay = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const day = new Date(r.at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    (acc[day] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {Object.entries(byDay).map(([day, items], di) => (
        <FadeIn key={day} delay={di * 0.03}>
          <div className="eyebrow mb-4">{day}</div>
          <ol className="relative ml-3 border-l border-border">
            {items.map((r, i) => {
              const Icon = ICON[r.kind];
              return (
                <li key={`${r.at}-${i}`} className="relative pb-5 pl-7 last:pb-0">
                  <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-muted">
                    <Icon size={12} />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="tabular w-16 shrink-0 text-xs text-subtle">
                      {new Date(r.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">{r.text}</span>
                    <span className="text-[11px] text-subtle">{r.origin}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </FadeIn>
      ))}
      <p className="text-xs text-subtle">Questions and checks are recorded in this browser only. Drafts and QA imports are shared with your team.</p>
    </div>
  );
}
