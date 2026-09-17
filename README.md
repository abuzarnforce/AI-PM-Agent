# AI PM Agent

An AI Product Manager Assistant that reads from Jira (and QA spreadsheets), reasons
with Gemini, and drafts the artifacts a PM would otherwise write by hand — user
stories, PRDs, health checks — without ever writing to Jira without explicit approval.

See [CLAUDE.md](./CLAUDE.md) for the full behavior spec (hard rules, templates, modes).

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000, go to the **Connector** tab, and paste in your own Jira
site URL + email + API token and your Gemini API key. That's the whole setup — no
`.env` file editing required. Anyone who downloads this app configures it the same way,
from their own account, without touching code or environment variables.

Credentials are stored locally by this app instance (`.data/connectors.json`, gitignored)
and are only ever sent to Jira and Google's Gemini API directly — never anywhere else.

`.env.example` still exists as an optional way for a self-hoster to pre-seed default
values on first run; anything saved through the Connector UI overrides it.

## Getting the credentials

- **Jira API token**: Atlassian account → Security → API tokens → Create token.
  The account email is the Atlassian account that token belongs to.
- **Gemini API key**: Google AI Studio → Get API key.

## What's in the UI

- **Connector** — connect your own Jira site and Gemini API key, with a live
  "Test connection" check for each.
- **Chat** — free-form questions answered from live Jira data, with ticket keys cited inline.
- **Health Check** — point at an epic key or sprint name, get missing-AC / unestimated /
  stale / scope-drift / QA-gap findings and an on-track / at-risk / blocked verdict.
- **Drafts** — every generated story, PRD, or issue update sits here as "needs triage"
  until you click Approve. Only Approve calls the real Jira write API.
- **Feedback Capture** — paste a raw note/comment/transcript excerpt; it's checked
  against the open backlog for duplicates before a draft story is created.

## Architecture

- `src/lib/connectorStore.ts` — file-backed store (`.data/connectors.json`) for user-supplied
  Jira/Gemini credentials, written by the Connector UI. Env vars only seed defaults on first run.
- `src/lib/config.ts` — reads live from the connector store on every call, so a saved
  credential takes effect immediately, no restart needed.
- `src/lib/jira.ts` — Jira REST API v3 client (search, get issue/comments, create/update issue).
  `createIssue`/`updateIssue` are only ever called from `src/lib/drafts.ts#approveDraft`.
- `src/lib/gemini.ts` — Gemini client wrapper (`generateText`, `generateJson`).
- `src/lib/drafts.ts` — the approval-gated draft store (file-backed at `.data/drafts.json`).
- `src/lib/duplicates.ts` — backlog duplicate/near-duplicate detection.
- `src/lib/excel.ts` — QA spreadsheet parser (`xlsx`), normalizes to `{id, steps, expected, actual, status, linkedTicket}`.
- `src/lib/templates.ts` — renders the exact User Story / PRD / Health Check templates from CLAUDE.md.
- `src/app/api/*` — route handlers backing each UI panel.
