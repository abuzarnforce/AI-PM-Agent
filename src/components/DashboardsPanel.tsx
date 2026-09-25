"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, ArrowRight, Sparkles } from "lucide-react";
import { useNav } from "@/lib/nav";
import { getLastProject, logActivity, setLastProject } from "@/lib/activity";
import { useJiraBaseUrl } from "@/lib/useJiraBaseUrl";
import { Button, EmptyState, ErrorState, Metric, PageHeader, Section, Skeleton, SourceChip } from "./ui";

interface WidgetData {
  projectKey: string;
  statusBreakdown: { label: string; count: number; jql: string }[];
  issueTypeBreakdown: { type: string; count: number }[];
  openBugs: number;
  createdLast30: number;
  resolvedLast30: number;
}

const STATUS_COLOR: Record<string, string> = {
  "To Do": "rgb(var(--color-fg) / 0.18)",
  "In Progress": "rgb(var(--color-accent))",
  Done: "rgb(var(--tone-green))",
};

export default function DashboardsPanel() {
  const { navigate } = useNav();
  const jiraBaseUrl = useJiraBaseUrl();
  const [projectKey, setProjectKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WidgetData | null>(null);

  async function load(key = projectKey) {
    const k = key.trim().toUpperCase();
    if (!k) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard-widgets?projectKey=${encodeURIComponent(k)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setLastProject(k);
      logActivity("projects", `Loaded delivery snapshot for ${k}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const k = getLastProject();
    if (k) {
      setProjectKey(k);
      load(k);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusTotal = data ? data.statusBreakdown.reduce((s, b) => s + b.count, 0) : 0;
  const typeMax = data ? Math.max(...data.issueTypeBreakdown.map((t) => t.count), 1) : 1;
  const net = data ? data.createdLast30 - data.resolvedLast30 : 0;
  const donePct = data && statusTotal ? Math.round(((data.statusBreakdown.find((b) => b.label === "Done")?.count ?? 0) / statusTotal) * 100) : 0;
  const jqlLink = (jql: string) => (jiraBaseUrl ? `${jiraBaseUrl}/issues/?jql=${encodeURIComponent(jql)}` : undefined);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Projects"
        title={data ? data.projectKey : "Delivery by project"}
        description="Live counts computed from Jira with JQL — every number links back to the query behind it."
        actions={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex gap-2"
          >
            <input
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              placeholder="Project key"
              aria-label="Project key"
              className="w-36 px-3 py-2 text-sm uppercase placeholder:normal-case"
            />
            <Button type="submit" variant="primary" loading={loading} disabled={!projectKey.trim()}>
              Load
            </Button>
          </form>
        }
      />

      {error && <ErrorState message={error} onRetry={() => load()} />}

      {!data && !loading && !error && (
        <EmptyState
          icon={FolderKanban}
          title="Choose a project to see how delivery is going"
          description="Enter a Jira project key. PM Agent remembers it, so Home and the Agent use it by default."
        />
      )}

      {loading && !data && (
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {data && (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border py-6 lg:grid-cols-4">
            <Metric label="Done" value={`${donePct}%`} caption={`of ${statusTotal} issues`} />
            <Metric label="Open bugs" value={data.openBugs} tone={data.openBugs ? "red" : "green"} caption={data.openBugs ? "Unresolved" : "None open"} />
            <Metric label="Created (30d)" value={data.createdLast30} />
            <Metric
              label="Resolved (30d)"
              value={data.resolvedLast30}
              tone={net > 0 ? "amber" : "green"}
              caption={net > 0 ? `${net} more created than resolved` : net < 0 ? `Burning down by ${-net}` : "Even"}
            />
          </div>

          <Section title="Are we on track?" description="Issues by status category." className="!mt-10">
            <div className="flex h-2 overflow-hidden rounded-full bg-fg/[0.06]">
              {data.statusBreakdown.map((b) => (
                <motion.div
                  key={b.label}
                  initial={{ width: 0 }}
                  animate={{ width: `${statusTotal ? (b.count / statusTotal) * 100 : 0}%` }}
                  style={{ backgroundColor: STATUS_COLOR[b.label] }}
                  title={`${b.label}: ${b.count}`}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {data.statusBreakdown.map((b) => (
                <a
                  key={b.label}
                  href={jqlLink(b.jql)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2.5 text-sm hover:border-fg/20"
                >
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: STATUS_COLOR[b.label] }} />
                  <span className="flex-1 text-muted">{b.label}</span>
                  <span className="tabular font-medium">{b.count}</span>
                  <ArrowRight size={13} className="text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </Section>

          <Section title="What kind of work is this?" description="Issues by type.">
            <div className="space-y-3">
              {[...data.issueTypeBreakdown]
                .sort((a, b) => b.count - a.count)
                .map((t) => (
                  <div key={t.type} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-4 text-sm">
                    <span className="truncate text-muted">{t.type}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                      <motion.div className="h-full rounded-full bg-fg/70" initial={{ width: 0 }} animate={{ width: `${(t.count / typeMax) * 100}%` }} />
                    </div>
                    <span className="tabular text-right font-medium">{t.count}</span>
                  </div>
                ))}
            </div>
          </Section>

          <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
            <SourceChip kind="Jira" label={`project ${data.projectKey}`} href={jiraBaseUrl ? `${jiraBaseUrl}/browse/${data.projectKey}` : undefined} />
            <span className="flex-1" />
            <Button icon={Sparkles} onClick={() => navigate("agent", { question: `Summarize delivery progress in ${data.projectKey} this week.` })}>
              Summarize with PM Agent
            </Button>
            <Button onClick={() => navigate("health")}>Run a sprint check</Button>
          </div>
        </div>
      )}
    </div>
  );
}
