# AI PM Agent

An AI Product Manager Assistant that reads from Jira (and QA spreadsheets), reasons
with Gemini, and drafts the artifacts a PM would otherwise write by hand — user
stories, PRDs, health checks — without ever writing to Jira without explicit approval.

See [CLAUDE.md](./CLAUDE.md) for the full behavior spec (hard rules, templates, modes).

## Setup

```bash
npm install
cp .env.example .env.local
# fill in JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, GEMINI_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000.

## Getting the credentials

- **Jira API token**: Atlassian account → Security → API tokens → Create token.
  `JIRA_EMAIL` is the Atlassian account email that token belongs to.
- **Gemini API key**: Google AI Studio → Get API key.

## What's in the UI

- **Chat** — free-form questions answered from live Jira data, with ticket keys cited inline.
- **Health Check** — point at an epic key or sprint name, get missing-AC / unestimated /
  stale / scope-drift / QA-gap findings and an on-track / at-risk / blocked verdict.
- **Drafts** — every generated story, PRD, or issue update sits here as "needs triage"
  until you click Approve. Only Approve calls the real Jira write API.
- **Feedback Capture** — paste a raw note/comment/transcript excerpt; it's checked
  against the open backlog for duplicates before a draft story is created.

## Architecture

- `src/lib/jira.ts` — Jira REST API v3 client (search, get issue/comments, create/update issue).
  `createIssue`/`updateIssue` are only ever called from `src/lib/drafts.ts#approveDraft`.
- `src/lib/gemini.ts` — Gemini client wrapper (`generateText`, `generateJson`).
- `src/lib/drafts.ts` — the approval-gated draft store (file-backed at `.data/drafts.json`).
- `src/lib/duplicates.ts` — backlog duplicate/near-duplicate detection.
- `src/lib/excel.ts` — QA spreadsheet parser (`xlsx`), normalizes to `{id, steps, expected, actual, status, linkedTicket}`.
- `src/lib/templates.ts` — renders the exact User Story / PRD / Health Check templates from CLAUDE.md.
- `src/app/api/*` — route handlers backing each UI panel.
