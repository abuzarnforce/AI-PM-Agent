"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, GitCommit, GitPullRequest, GitMerge, RefreshCw, Plug } from "lucide-react";

interface BranchStat {
  name: string;
  commitCount: number;
}

interface CommitterStat {
  author: string;
  commitCount: number;
  branches: string[];
}

interface PullAuthorStat {
  author: string;
  opened: number;
  merged: number;
}

interface Snapshot {
  generatedAt: string;
  owner: string;
  repo: string;
  branches: BranchStat[];
  committers: CommitterStat[];
  pulls: { opened: number; merged: number; byAuthor: PullAuthorStat[] };
  today: { commits: number; pullsOpened: number; pullsMerged: number };
}

const BRANCH_COLORS = ["#5b8def", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#94a3b8"];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function RepoActivityPanel() {
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
        if (res.status === 400) {
          setNotConfigured(true);
        } else {
          throw new Error(json.error);
        }
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

  const branchMax = snapshot ? Math.max(...snapshot.branches.map((b) => b.commitCount), 1) : 1;
  const branchTotal = snapshot ? snapshot.branches.reduce((s, b) => s + b.commitCount, 0) : 0;
  const committerMax = snapshot ? Math.max(...snapshot.committers.map((c) => c.commitCount), 1) : 1;
  const pullMax = snapshot ? Math.max(...snapshot.pulls.byAuthor.map((p) => p.opened), 1) : 1;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-fg/[0.06] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-panel-title">Repo Activity</h1>
            <p className="text-sm text-fg/50">
              Who's pushing commits and opening/merging Pull Requests, per branch, over the last 30 days.
            </p>
          </div>
          {snapshot && (
            <button
              onClick={refresh}
              disabled={refreshing}
              className="btn flex shrink-0 items-center gap-1.5 rounded-md border border-fg/10 px-3 py-1.5 text-sm text-fg/70 hover:bg-fg/5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
          )}
        </div>
        {snapshot && (
          <div className="mt-2 text-xs text-fg/30">
            {snapshot.owner}/{snapshot.repo} · refreshed {relativeTime(snapshot.generatedAt)} · auto-refreshes daily
          </div>
        )}
      </div>

      <div className="space-y-5 p-4">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && !snapshot && !notConfigured && (
          <div className="py-16 text-center text-sm text-fg/30">Loading repo activity…</div>
        )}

        {notConfigured && (
          <div className="card-surface flex items-center gap-3 rounded-2xl p-4 text-sm text-fg/60">
            <Plug size={16} className="shrink-0 text-fg/40" />
            GitHub isn't connected yet. Add a repo and a read-only token from the Connector tab to
            see daily commit and Pull Request activity here.
          </div>
        )}

        {snapshot && (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="card-surface rounded-2xl p-4"
              >
                <GitCommit size={16} className="text-accent" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{snapshot.today.commits}</div>
                <div className="text-xs text-fg/40">Commits today</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.05 }}
                className="card-surface rounded-2xl p-4"
              >
                <GitBranch size={16} className="text-violet-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  {snapshot.branches.filter((b) => b.commitCount > 0).length}
                </div>
                <div className="text-xs text-fg/40">Active branches (30d)</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.1 }}
                className="card-surface rounded-2xl p-4"
              >
                <GitPullRequest size={16} className="text-amber-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{snapshot.pulls.opened}</div>
                <div className="text-xs text-fg/40">PRs opened (30d)</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.15 }}
                className="card-surface rounded-2xl p-4"
              >
                <GitMerge size={16} className="text-emerald-300" />
                <div className="mt-2 text-2xl font-semibold tracking-tight">{snapshot.pulls.merged}</div>
                <div className="text-xs text-fg/40">PRs merged (30d)</div>
              </motion.div>
            </div>

            {/* Branch breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.2 }}
              className="card-surface rounded-2xl p-4"
            >
              <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                <GitBranch size={14} />
                Commits by branch (30d)
              </div>
              <p className="mb-3 text-xs text-fg/30">
                Branches share history with whatever they were cut from, so the same commit can
                count toward several branches here — "Top committers" below counts each commit once.
              </p>
              {snapshot.branches.every((b) => b.commitCount === 0) ? (
                <div className="text-sm text-fg/30">No commits in the last 30 days.</div>
              ) : (
                <>
                  <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-fg/5">
                    {snapshot.branches
                      .filter((b) => b.commitCount > 0)
                      .map((b, i) => (
                        <div
                          key={b.name}
                          style={{
                            width: `${branchTotal ? (b.commitCount / branchTotal) * 100 : 0}%`,
                            backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length],
                          }}
                          title={`${b.name}: ${b.commitCount}`}
                        />
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-fg/60">
                    {snapshot.branches
                      .filter((b) => b.commitCount > 0)
                      .slice(0, 8)
                      .map((b, i) => (
                        <span key={b.name} className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                          />
                          {b.name}: <span className="font-medium text-fg">{b.commitCount}</span>
                        </span>
                      ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* Top committers */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.25 }}
              className="card-surface rounded-2xl p-4"
            >
              <div className="mb-3 text-sm font-medium text-fg/70">Top committers (30d)</div>
              {snapshot.committers.length === 0 ? (
                <div className="text-sm text-fg/30">No commits in the last 30 days.</div>
              ) : (
                <div className="space-y-2">
                  {snapshot.committers.slice(0, 10).map((c, i) => (
                    <div key={c.author} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 truncate text-fg/60" title={c.author}>
                        {c.author}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-fg/5">
                        <motion.div
                          className="h-full rounded-full bg-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${(c.commitCount / committerMax) * 100}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.3 + i * 0.03 }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-medium">{c.commitCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* PR contributors */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.3 }}
              className="card-surface rounded-2xl p-4"
            >
              <div className="mb-3 text-sm font-medium text-fg/70">Pull Requests by contributor (30d)</div>
              {snapshot.pulls.byAuthor.length === 0 ? (
                <div className="text-sm text-fg/30">No Pull Requests in the last 30 days.</div>
              ) : (
                <div className="space-y-2">
                  {snapshot.pulls.byAuthor.slice(0, 10).map((p, i) => (
                    <div key={p.author} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 truncate text-fg/60" title={p.author}>
                        {p.author}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-fg/5">
                        <motion.div
                          className="h-full rounded-full bg-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${(p.opened / pullMax) * 100}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.35 + i * 0.03 }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-fg/50">
                        {p.opened} opened · {p.merged} merged
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
