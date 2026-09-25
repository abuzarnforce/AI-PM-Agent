"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, RefreshCw } from "lucide-react";
import { useNav } from "@/lib/nav";
import { Button, EmptyState, ErrorState, Metric, Section, Skeleton, SourceChip, relativeTime } from "./ui";

interface Snapshot {
  generatedAt: string;
  owner: string;
  repo: string;
  branches: { name: string; commitCount: number }[];
  committers: { author: string; commitCount: number; branches: string[] }[];
  pulls: { opened: number; merged: number; byAuthor: { author: string; opened: number; merged: number }[] };
  today: { commits: number; pullsOpened: number; pullsMerged: number };
}

function Bars({ rows, max }: { rows: { label: string; value: number; note: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[8rem_1fr_6.5rem] items-center gap-4 text-sm">
          <span className="truncate text-muted" title={r.label}>
            {r.label}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
            <motion.div className="h-full rounded-full bg-fg/70" initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="tabular text-right text-xs text-muted">{r.note}</span>
        </div>
      ))}
    </div>
  );
}

export default function RepoActivityPanel() {
  const { navigate } = useNav();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const res = await fetch("/api/repo-activity");
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 400) setNotConfigured(true);
        else throw new Error(json.error);
        return;
      }
      setSnapshot(json.snapshot);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/repo-activity/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSnapshot(json.snapshot);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (notConfigured)
    return (
      <EmptyState
        icon={GitBranch}
        title="GitHub isn't connected yet."
        description="Add a repository and a read-only token to see who's committing and merging each day."
        action={
          <Button variant="primary" onClick={() => navigate("connections")}>
            Connect GitHub
          </Button>
        }
      />
    );

  if (loading && !snapshot)
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  const active = snapshot?.branches.filter((b) => b.commitCount > 0) ?? [];

  return (
    <div>
      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={snapshot ? refresh : load} />
        </div>
      )}
      {snapshot && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <SourceChip kind="GitHub" label={`${snapshot.owner}/${snapshot.repo}`} href={`https://github.com/${snapshot.owner}/${snapshot.repo}`} />
              refreshed {relativeTime(snapshot.generatedAt)} · updates daily
            </div>
            <Button icon={RefreshCw} loading={refreshing} onClick={refresh}>
              Refresh now
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-6 lg:grid-cols-4">
            <Metric label="Commits today" value={snapshot.today.commits} />
            <Metric label="Active branches" value={active.length} caption="last 30 days" />
            <Metric label="PRs opened" value={snapshot.pulls.opened} caption="last 30 days" />
            <Metric label="PRs merged" value={snapshot.pulls.merged} caption="last 30 days" />
          </div>

          <Section title="Where is work happening?" description="Commits by branch. Branches share history, so a commit can count toward several." className="!mt-10">
            {active.length === 0 ? (
              <p className="text-sm text-muted">No commits in the last 30 days.</p>
            ) : (
              <Bars
                rows={active.slice(0, 8).map((b) => ({ label: b.name, value: b.commitCount, note: `${b.commitCount} commits` }))}
                max={Math.max(...active.map((b) => b.commitCount), 1)}
              />
            )}
          </Section>

          <div className="grid gap-x-10 lg:grid-cols-2">
            <Section title="Who's committing?" description="Each commit counted once.">
              {snapshot.committers.length === 0 ? (
                <p className="text-sm text-muted">No commits in the last 30 days.</p>
              ) : (
                <Bars
                  rows={snapshot.committers.slice(0, 10).map((c) => ({ label: c.author, value: c.commitCount, note: `${c.commitCount}` }))}
                  max={Math.max(...snapshot.committers.map((c) => c.commitCount), 1)}
                />
              )}
            </Section>
            <Section title="Who's shipping PRs?">
              {snapshot.pulls.byAuthor.length === 0 ? (
                <p className="text-sm text-muted">No Pull Requests in the last 30 days.</p>
              ) : (
                <Bars
                  rows={snapshot.pulls.byAuthor.slice(0, 10).map((p) => ({ label: p.author, value: p.opened, note: `${p.opened} opened · ${p.merged} merged` }))}
                  max={Math.max(...snapshot.pulls.byAuthor.map((p) => p.opened), 1)}
                />
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
