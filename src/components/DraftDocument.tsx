"use client";

import { AlertTriangle } from "lucide-react";
import { useJiraBaseUrl, jiraTicketUrl, linkifyTicketKeys } from "@/lib/useJiraBaseUrl";
import { Badge, SourceChip } from "./ui";

const GHERKIN_RE = /^\s*Given (.+?), When (.+?), Then (.+)$/;

/** Renders a draft body produced by lib/templates.ts as a readable document,
 * without changing the stored text (which is what gets written to Jira). */
export function DraftDocument({ body }: { body: string }) {
  const jiraBaseUrl = useJiraBaseUrl();
  const lines = body.split("\n");
  const out: JSX.Element[] = [];

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const prevBlank = i === 0 || lines[i - 1].trim() === "";
    if (!line.trim()) return;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^Title: (.+)$/))) {
      out.push(<h3 key={i} className="text-xl font-semibold tracking-tight">{m[1]}</h3>);
    } else if ((m = line.match(/^(Source|Status): (.+)$/))) {
      out.push(
        <div key={i} className="flex gap-2 text-xs text-muted">
          <span className="w-14 shrink-0 text-subtle">{m[1]}</span>
          <span>{linkifyTicketKeys(m[2], jiraBaseUrl)}</span>
        </div>
      );
    } else if ((m = line.match(GHERKIN_RE))) {
      out.push(
        <div key={i} className="grid gap-1 rounded-md border border-border bg-bg px-3 py-2.5 text-sm sm:grid-cols-[3.5rem_1fr]">
          {[
            ["Given", m[1]],
            ["When", m[2]],
            ["Then", m[3]],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <span className="font-mono text-xs font-medium uppercase leading-6 text-accent">{k}</span>
              <span className="leading-6">{v}</span>
            </div>
          ))}
        </div>
      );
    } else if (prevBlank && (m = line.match(/^(\d+)\. (.+)$/))) {
      out.push(
        <h4 key={i} className="!mt-6 text-sm font-semibold first:!mt-0">
          {m[2]}
        </h4>
      );
    } else if (/^[A-Z][\w ()/&-]{1,40}:$/.test(line)) {
      out.push(<div key={i} className="eyebrow !mt-4">{line.slice(0, -1)}</div>);
    } else if ((m = line.match(/^\s*(?:-|(\d+)\.) (.+)$/))) {
      out.push(
        <div key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="tabular w-4 shrink-0 text-right text-subtle">{m[1] ? `${m[1]}.` : "•"}</span>
          <span>{linkifyTicketKeys(m[2], jiraBaseUrl)}</span>
        </div>
      );
    } else {
      out.push(
        <p key={i} className="text-[15px] leading-relaxed">
          {linkifyTicketKeys(line.trim(), jiraBaseUrl)}
        </p>
      );
    }
  });

  return <div className="space-y-2">{out}</div>;
}

const CONFIDENCE_TONE = { high: "red", medium: "amber", low: "neutral" } as const;

export function DuplicateMatches({ matches }: { matches: { key: string; summary: string; confidence: "low" | "medium" | "high"; reason: string }[] }) {
  const jiraBaseUrl = useJiraBaseUrl();
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-5">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle size={16} className="text-amber-400" />
        This may already exist in your backlog
      </div>
      <p className="mt-1 text-sm text-muted">
        PM Agent checked open issues first and found {matches.length} possible match{matches.length === 1 ? "" : "es"}, so it didn't create a new draft.
      </p>
      <ul className="mt-4 space-y-2">
        {matches.map((m) => (
          <li key={m.key} className="rounded-lg border border-border bg-panel p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <SourceChip kind="Jira" label={m.key} href={jiraTicketUrl(jiraBaseUrl, m.key)} />
              <span className="min-w-0 flex-1 text-sm font-medium">{m.summary}</span>
              <Badge tone={CONFIDENCE_TONE[m.confidence]}>{m.confidence} similarity</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{m.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
