---
format: 1920x1080
duration: 82.9s
message: "PM Agent connects Jira, GitHub and QA into one intelligent workspace — AI does the heavy lifting, the PM stays in control."
arc: Scattered → Connected → Insight → Decision → Action → Lockup
audience: product managers and product/engineering leaders
mode: collaborative
music: bright modern tech launch, piano + light electronic pulse, builds to a drop, confident and optimistic
---

All data is fictional: workspace "Northwind Labs", project NWD, Sprint 24, tickets NWD-142 / NWD-156 / NWD-181, people Ava Chen, Marcus Reid, Priya Shah. No real client data anywhere.

## Frame 1 — Everywhere at once

- scene: Colorful app cards (ticket, PR, test sheet, sticky note) pop in scattered across a warm white stage, each in its own tint, drifting apart
- duration: 8.0s
- transition_in: cut
- blueprint: overwhelm-surround
- voiceover: "Your product lives everywhere. Tickets. Pull requests. Test sheets. Customer notes. And none of it talks to each other."
- asset_candidates: none (typography + HTML UI cards)
- status: animated
- src: compositions/frames/01-everywhere.html

Hook. Each noun gets its card on the word. On "none of it talks", thin dashed lines try to connect cards and snap broken.

## Frame 2 — The Intelligence Layer

- scene: Cards fly inward, three source lines draw into the PM Agent core mark; core blooms, then Insight → Decision → Action chips pop out on the right
- duration: 7.0s
- transition_in: cut
- blueprint: constellation-hub
- voiceover: "Meet PM Agent. One intelligent layer that turns all of it into insight, decisions, and action."
- asset_candidates: none (logo mark rebuilt as SVG from IntelligenceLayer.tsx)
- status: animated
- src: compositions/frames/02-intelligence-layer.html

Music drop lands on "Meet PM Agent." Hard beat-synced cut. Signature moment #1.

## Frame 3 — What matters today

- scene: Home screen assembles from exploded layers: "Good morning, Ava", four metric tiles, "Needs your attention" insight card with source chip; camera pushes onto the source chip
- duration: 5.4s
- transition_in: zoom-through
- blueprint: grid-card-assemble
- voiceover: "Open it, and you already know what matters today. Every signal, with its source."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/03-home.html

## Frame 4 — Ask anything

- scene: Composer types "Is Sprint 24 on track?"; progress steps tick; structured answer card assembles: "At risk" pill, three findings with ticket keys, recommended action, source chips; camera lands on the "How I searched" JQL line
- duration: 8.0s
- transition_in: crossfade
- blueprint: prompt-type-submit-generate
- voiceover: "Ask anything. PM Agent reads your Jira, reasons it through, and shows you exactly how it found the answer."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/04-ask-anything.html

Signature moment #2: the answer assembling card by card.

## Frame 5 — Sprint health

- scene: Jira dashboard on a soft blue block: status bar fills, created-vs-resolved trend draws, issues-by-type bars rise; one red "trending wrong" arrow highlight
- duration: 6.3s
- transition_in: crossfade
- blueprint: dataviz-countup
- voiceover: "Sprint health, at a glance. What's moving, what's stuck, and what's trending the wrong way."
- asset_candidates: none (HTML charts)
- status: animated
- src: compositions/frames/05-sprint-health.html

## Frame 6 — Release check

- scene: QA dashboard on mint block: ring counts up to 96%, release bar fills, three blocked scenarios slide in with names; camera push onto "3 blockers"
- duration: 6.9s
- transition_in: crossfade
- blueprint: dataviz-countup
- voiceover: "Your QA sheet becomes a live release check. Ninety-six percent passing. Three blockers, named."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/06-release-check.html

Signature moment #3: the 96% count-up.

## Frame 7 — Daily standup

- scene: Daily Standup board on a butter block: KPI strip (8 members · 7 present · 1 absent · 3 blocked), team cards pop in with Yesterday / Today / Blockers and confidence dots; then the AI Daily Summary card slides up (Attention needed · Delivery risk · Carry-over · PM actions); camera pushes onto "PM actions"
- duration: 6.9s
- transition_in: crossfade
- blueprint: grid-card-assemble
- voiceover: "Run standup in one place. Who's in, what moved, what's blocked, and an AI summary of what needs you."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/07-standup.html

Present/absent chips flip on "who's in"; a red blocker chip on "blocked"; the summary card arrives on "AI summary". Fictional team only.

## Frame 8 — Follow-ups

- scene: Follow-ups list (work assigned by the PM that doesn't live in Jira) on a coral block: rows with owner avatar, due date and status pill drop in; one row flips to amber "Overdue", another checks off to "Completed"; headline "Nothing slips."
- duration: 6.8s
- transition_in: push-slide
- blueprint: agent-progress-theater
- voiceover: "And the work that never makes it into Jira? Every follow-up, with an owner and a due date. Nothing slips."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/08-follow-ups.html

Example rows: "Share pricing feedback with design" (Priya, due Thu), "Confirm vendor demo slot" (Marcus, Overdue), "Send release notes draft" (Ava, Completed).

## Frame 9 — Connected

- scene: Jira, GitHub, Gemini connector rows (generic glyphs, no third-party logos) flip from "Connect" to green "Connected" in a stagger
- duration: 4.2s
- transition_in: push-slide
- blueprint: grid-card-assemble
- voiceover: "Connect Jira, GitHub, and Gemini in minutes."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/09-connected.html

## Frame 10 — One keystroke

- scene: Huge "Ctrl K" keycaps press; command palette drops in, types "NWD-156", result row highlights
- duration: 3.8s
- transition_in: cut
- blueprint: prompt-type-submit-generate
- voiceover: "Then everything is one keystroke away."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/10-keystroke.html

Fastest beat.

## Frame 11 — You decide

- scene: Draft story card (Gherkin criteria, "Human approval required"); Approve button press → Confirm; card stamps "Approved"; then cut to huge serif line "You decide." on white
- duration: 6.8s
- transition_in: crossfade
- blueprint: cursor-ui-demo
- voiceover: "And nothing touches Jira until you say so. PM Agent drafts. You decide."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/11-you-decide.html

Most important line; held read. Signature moment #4.

## Frame 12 — Built for PMs

- scene: Color-blocked card grid pops in: User Story, PRD, BRD, Feedback → Story, Health Check, Standup; each tile its own tint
- duration: 5.9s
- transition_in: zoom-through
- blueprint: grid-card-assemble
- voiceover: "Stories. PRDs. Feedback turned into work. All in your team's templates."
- asset_candidates: none (HTML UI)
- status: animated
- src: compositions/frames/12-built-for-pms.html

## Frame 13 — Move product forward

- scene: Three lines draw and converge into the PM Agent mark, wordmark; three tagline beats; small "Product UI shown with demo data" footer
- duration: 7.0s
- transition_in: crossfade
- blueprint: logo-assemble-lockup
- voiceover: "PM Agent. Connect everything. Understand anything. Move product forward."
- asset_candidates: none (SVG mark)
- status: animated
- src: compositions/frames/13-outro.html

Ends on a still lockup.
