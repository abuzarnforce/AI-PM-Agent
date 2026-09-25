"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, ScrollText, Briefcase, ListChecks, Megaphone, RotateCcw, Inbox, PenTool } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNav } from "@/lib/nav";
import { getLastProject, logActivity } from "@/lib/activity";
import { Badge, Button, ErrorState, Field, HumanApprovalNote, PageHeader, WorkingState, inputCls } from "./ui";
import { DraftDocument, DuplicateMatches } from "./DraftDocument";

type StudioKind = "user_story" | "prd" | "brd";

const KINDS: { id: StudioKind | null; label: string; blurb: string; icon: LucideIcon; placeholder?: string }[] = [
  {
    id: "user_story",
    label: "User Story",
    blurb: "Turn a requirement into a Jira-ready story with Gherkin criteria.",
    icon: FileText,
    placeholder: "Managers need to bulk-approve leave requests instead of one at a time…",
  },
  { id: "prd", label: "PRD", blurb: "Problem, goals, metrics, scope, risks and rollout.", icon: ScrollText, placeholder: "We want SSO login for enterprise customers because…" },
  { id: "brd", label: "BRD", blurb: "Business objective, stakeholders and numbered requirements.", icon: Briefcase, placeholder: "Finance needs automated expense-category validation to cut review time…" },
  { id: null, label: "Acceptance Criteria", blurb: "Testable criteria for an existing story.", icon: ListChecks },
  { id: null, label: "Stakeholder Update", blurb: "A concise executive update from live data.", icon: Megaphone },
];

const STEPS: Record<StudioKind, string[]> = {
  user_story: ["Reading your brief…", "Drafting the story and acceptance criteria…", "Checking the backlog for duplicates…", "Saving to Drafts…"],
  prd: ["Reading your brief…", "Drafting the PRD…", "Saving to Drafts…"],
  brd: ["Reading your brief…", "Drafting the BRD…", "Saving to Drafts…"],
};

export default function StudioPanel() {
  const { intent, navigate } = useNav();
  const [kind, setKind] = useState<StudioKind>(intent?.studioKind ?? "user_story");
  const [brief, setBrief] = useState(intent?.brief ?? "");
  const [source, setSource] = useState(intent?.brief ? "PM Agent answer" : "");
  const [projectKey, setProjectKey] = useState(getLastProject);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const active = KINDS.find((k) => k.id === kind)!;

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          brief,
          source,
          projectKey: kind === "user_story" ? projectKey.trim().toUpperCase() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      logActivity(
        "studio",
        data.duplicateFound ? `Found possible duplicates for “${data.extracted?.title}”` : `Drafted ${active.label}: “${data.draft.title}”`
      );
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Studio" title="Build product artifacts faster." description="Start from a brief. PM Agent drafts it in your team's template and puts it in Drafts for review." />

      <div role="radiogroup" aria-label="Artifact type" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {KINDS.map((k) => {
          const Icon = k.icon;
          const selected = k.id === kind;
          return (
            <button
              key={k.label}
              role="radio"
              aria-checked={selected}
              disabled={!k.id}
              onClick={() => {
                if (!k.id) return;
                setKind(k.id);
                setResult(null);
                setError(null);
              }}
              className={`btn relative rounded-lg border p-4 text-left transition-colors disabled:cursor-default ${
                selected ? "border-fg/40 bg-panel" : "border-border hover:border-fg/20 disabled:hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={18} className={selected ? "text-fg" : "text-muted"} />
                {!k.id && <Badge>Coming soon</Badge>}
              </div>
              <div className={`mt-3 text-sm font-medium ${k.id ? "" : "text-muted"}`}>{k.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{k.blurb}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
          className="space-y-5"
        >
          <Field label="Brief" hint="What problem, for whom, and why now">
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={active.placeholder} rows={8} className={`${inputCls} leading-relaxed`} />
          </Field>
          <Field label="Source" hint="Required — cited on the draft">
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Meeting note, demo date + stakeholder, ticket…" className={inputCls} />
          </Field>
          {kind === "user_story" && (
            <Field label="Project" hint="Checks for duplicates first">
              <input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} placeholder="e.g. ONEHR" className={`${inputCls} uppercase placeholder:normal-case`} />
            </Field>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" icon={PenTool} loading={loading} disabled={!brief.trim() || !source.trim()}>
              Draft {active.label}
            </Button>
            <HumanApprovalNote>Lands in Drafts — nothing is sent anywhere without your approval.</HumanApprovalNote>
          </div>
        </form>

        <div className="min-h-[18rem] rounded-xl border border-border bg-panel p-6 sm:p-8">
          {error && <ErrorState message={error} onRetry={generate} />}
          {loading && <WorkingState steps={STEPS[kind]} interval={2200} />}
          {!loading && !error && !result && (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <active.icon size={22} className="text-subtle" />
              <div className="mt-3 text-sm font-medium">Your {active.label} will appear here</div>
              <p className="mt-1 max-w-xs text-sm text-muted">Written in your team's template, ready for review.</p>
            </div>
          )}
          {result?.duplicateFound && (
            <div className="space-y-6">
              <DuplicateMatches matches={result.duplicateCheck.matches} />
              <div>
                <div className="eyebrow mb-3">What PM Agent would have drafted</div>
                <div className="text-lg font-semibold">{result.extracted.title}</div>
                <p className="mt-1 text-sm text-muted">
                  As a {result.extracted.persona}, I want {result.extracted.need}, so that {result.extracted.benefit}.
                </p>
              </div>
            </div>
          )}
          {result?.draft && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge tone="amber" dot>
                  needs triage
                </Badge>
                <span className="text-xs text-muted">Saved to Drafts · review before publishing</span>
              </div>
              <DraftDocument body={result.draft.body} />
              <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-5">
                <Button variant="primary" icon={Inbox} onClick={() => navigate("drafts", { subtab: result.draft.id })}>
                  Review in Drafts
                </Button>
                <Button icon={RotateCcw} onClick={generate} title="Creates a new draft; the current one stays in Drafts">
                  Regenerate
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
