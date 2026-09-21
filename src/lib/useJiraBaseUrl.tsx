"use client";

import { useEffect, useState } from "react";

/** Client-side hook for the current Jira site's base URL, so ticket keys shown
 * anywhere in the UI can link straight to the real Jira issue. */
export function useJiraBaseUrl(): string | null {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setBaseUrl(d.jiraBaseUrl ?? null))
      .catch(() => {});
  }, []);
  return baseUrl;
}

export function jiraTicketUrl(baseUrl: string | null, key: string): string | null {
  if (!baseUrl) return null;
  return `${baseUrl}/browse/${key}`;
}

const TICKET_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

/** Wraps every Jira ticket key found in a plain-text string with a link,
 * for text that mixes prose and ticket references (e.g. "ONEHR-461: summary"). */
export function linkifyTicketKeys(text: string, baseUrl: string | null): (string | JSX.Element)[] {
  if (!baseUrl) return [text];
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TICKET_KEY_RE.lastIndex = 0;
  while ((match = TICKET_KEY_RE.exec(text))) {
    const [key] = match;
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a
        key={`${key}-${match.index}`}
        href={jiraTicketUrl(baseUrl, key) ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:underline"
      >
        {key}
      </a>
    );
    lastIndex = match.index + key.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
