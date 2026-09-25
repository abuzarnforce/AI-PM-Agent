"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Inbox, MessagesSquare, Search, Wand2 } from "lucide-react";
import { useNav } from "@/lib/nav";
import { getLastProject, logActivity } from "@/lib/activity";
import { Badge, Button, ErrorState, Field, HumanApprovalNote, PageHeader, Section, WorkingState, inputCls } from "./ui";
import { DraftDocument, DuplicateMatches } from "./DraftDocument";

const STEPS = ["Reading the feedback…", "Extracting the underlying request…", "Checking the backlog for duplicates…", "Drafting a story…"];

const HOW = [
  { icon: Search, title: "Extract", body: "Finds the real request behind the comment, note or transcript." },
  { icon: MessagesSquare, title: "De-duplicate", body: "Searches open issues in the project before drafting anything." },
  { icon: Wand2, title: "Draft", body: "Writes a story in your template, tagged needs triage, with the source attached." },
];

export default function FeedbackCapturePanel() {
  const { navigate } = useNav();
  const [rawText, setRawText] = useState("");
  const [source, setSource] = useState("");
  const [projectKey, setProjectKey] = useState(getLastProject);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/feedback-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, source, projectKey: projectKey.trim().toUpperCase() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      logActivity(
        "feedback",
        data.duplicateFound ? `Feedback matched existing work (${data.duplicateCheck.matches.map((m: any) => m.key).join(", ")})` : `Turned feedback into draft “${data.draft.title}”`,
        source
      );
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    file.text().then((t) => {
      setRawText(t.slice(0, 20000));
      if (!source) setSource(file.name);
    });
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Feedback"
        title="Turn feedback into work."
        description="Paste a customer comment, a call note or a transcript excerpt. PM Agent finds the request, checks it isn't already in the backlog, and drafts a story."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-5"
        >
          <Field
            label="Feedback"
            hint={
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-accent hover:text-accent-hover">
                <FileUp size={12} /> Import .txt / .md / .csv
              </button>
            }
          >
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="“Customer on the call said they can't filter the export by date range…”"
              rows={9}
              className={`${inputCls} leading-relaxed`}
            />
          </Field>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={importFile} />
          <Field label="Source" hint="Who said it, and when">
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Acme call, 12 Sep — Priya (Ops lead)" className={inputCls} />
          </Field>
          <Field label="Project" hint="For the duplicate check and the draft">
            <input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} placeholder="e.g. ONEHR" className={`${inputCls} uppercase placeholder:normal-case`} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" icon={Wand2} loading={loading} disabled={!rawText.trim() || !source.trim()}>
              Analyze feedback
            </Button>
            <HumanApprovalNote>Creates a draft only — never writes to Jira.</HumanApprovalNote>
          </div>
        </form>

        <div className="min-h-[18rem] rounded-xl border border-border bg-panel p-6 sm:p-8">
          {error && <ErrorState message={error} onRetry={submit} />}
          {loading && <WorkingState steps={STEPS} interval={2200} />}
          {!loading && !error && !result && (
            <div className="space-y-6">
              <div className="eyebrow">How it works</div>
              {HOW.map((h, i) => (
                <div key={h.title} className="flex gap-4">
                  <div className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted">{i + 1}</div>
                  <div>
                    <div className="text-sm font-medium">{h.title}</div>
                    <p className="mt-0.5 text-sm text-muted">{h.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {result?.duplicateFound && <DuplicateMatches matches={result.duplicateCheck.matches} />}
          {result?.draft && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge tone="amber" dot>
                  needs triage
                </Badge>
                <span className="text-xs text-muted">No duplicates found · saved to Drafts</span>
              </div>
              <DraftDocument body={result.draft.body} />
              <div className="mt-8 border-t border-border pt-5">
                <Button variant="primary" icon={Inbox} onClick={() => navigate("drafts", { subtab: result.draft.id })}>
                  Review in Drafts
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <Section title="Themes across many responses" description="Clustering a batch of survey or support feedback into themes and opportunities." className="!mt-14">
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-5 py-4 text-sm text-muted">
          <Badge>Coming soon</Badge>
          Today PM Agent analyzes one piece of feedback at a time.
        </div>
      </Section>
    </div>
  );
}
