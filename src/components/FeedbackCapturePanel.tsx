"use client";

import { useState } from "react";

export default function FeedbackCapturePanel() {
  const [rawText, setRawText] = useState("");
  const [source, setSource] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/feedback-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, source, projectKey: projectKey || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Feedback Capture</h1>
        <p className="text-sm text-white/50">
          Paste a raw comment, note, or transcript excerpt. It's checked for duplicates before a draft
          story is created — nothing is written to Jira here.
        </p>
      </div>

      <div className="space-y-3 p-4">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. 'Customer on the call said they can't filter the export by date range...'"
          rows={6}
          className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-3">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (meeting note, demo date + stakeholder, etc.)"
            className="w-80 rounded-md border border-border bg-panel px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <input
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            placeholder="Optional: project key for duplicate check + draft"
            className="w-72 rounded-md border border-border bg-panel px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={loading || !rawText.trim() || !source.trim()}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Processing…" : "Extract & check"}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {result?.duplicateFound && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <div className="mb-2 font-medium text-amber-300">
              Possible duplicate(s) found — surfacing instead of drafting a new story
            </div>
            {result.duplicateCheck.matches.map((m: any) => (
              <div key={m.key} className="mb-1 rounded bg-bg px-3 py-2">
                <span className="font-medium">{m.key}</span> ({m.confidence}) — {m.summary}
                <div className="text-white/50">{m.reason}</div>
              </div>
            ))}
          </div>
        )}

        {result?.draft && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-300">Draft created — tagged "needs triage"</div>
            <pre className="whitespace-pre-wrap rounded bg-bg p-3 text-xs text-white/80">
              {result.draft.body}
            </pre>
            <div className="mt-2 text-white/50">See the Drafts tab to approve or reject.</div>
          </div>
        )}
      </div>
    </div>
  );
}
