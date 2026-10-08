# PM Agent launch film v3 — frame build brief

Project: `C:\Users\Abuzar Siddiqui\AI-PM-Agent\videos\pm-agent-launch-v3` (PROJECT_DIR). Canvas 1920x1080. Captions disabled, but keep ALL content above y=900.

## Read first (mandatory)
1. `frame.md` — the look (Canva x Apple: warm white stage, one colour block per scene, Inter, white app windows, layered shadows, one blue accent).
2. The two APPROVED hero frames — copy their structure, CSS vocabulary, easing, shadow, chip/pill/window styles exactly so all 13 frames look like one product:
   - `compositions/frames/02-intelligence-layer.html`
   - `compositions/frames/04-ask-anything.html`
3. `.hyperframes/frame-packets/_role.md` if it exists is NOT needed; the rules below are complete.

## Hard rules (renderer contract — lint fails otherwise)
- File = exactly one bare `<template>…</template>`. Root `<div id="root" data-composition-id="<frame_id>" data-width="1920" data-height="1080" data-duration="<dur>">`. Style the root ONLY via `#root` (never a class on it), `width/height:100%`.
- All `<style>` and `<script>` INSIDE the template. Include `@font-face` for Inter → `assets/fonts/Inter-Variable.woff2` (path exactly as in the hero frames). Load GSAP `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js` inside the template.
- Full-bleed ground = its own `class="clip"` div (`data-start="0" data-duration="<dur>" data-track-index="0"`), stage = another clip on track 1. Every `.clip` has data-start/data-duration/data-track-index. Never tween a `.clip` element itself — animate children.
- Exactly one `gsap.timeline({ paused: true })` registered as `window.__timelines["<frame_id>"]`, built synchronously inside an IIFE.
- Entrances use `fromTo` (never `from`). If the same element gets a second fromTo, add `immediateRender: false` to the later one. Don't overlap two tweens on the same property of the same element.
- No CSS transform on any element you animate with GSAP transforms (center with left/top/inset, not translate). No CSS transitions/animations, no repeat/yoyo, no Math.random/Date.
- No exit tweens (the cut is the exit) except frame 13 which simply holds.
- Prefix every id/class with `f<NN>-` (e.g. `f07-card`).
- No `<audio>`/`<video>`, no images: everything is HTML/CSS/inline SVG. No third-party logos — Jira/GitHub/Gemini are shown as generic glyph tiles + the name in text.
- Visible text is short UI copy / labels, never a full narration sentence (2–3 word emphasis headline is OK where specified).
- UI text ≥ 20px at its hero moment. Body 24–28px, titles 36–44px, display 96–150px weight 700–750, tracking -0.04em.
- Hero visible by t≤0.5s. Reveals land ON the word timestamps given; keep content arriving across the whole duration, back half carries the key reveal; one slow camera push (`power2.inOut`) per shot onto the named detail.

## Fictional data ONLY (confidentiality — never use anything else)
Workspace "Northwind Labs", project NWD, Sprint 24, Release 2.4. People: Ava Chen (PM), Marcus Reid (Engineer), Priya Shah (QA), Leo Park (Designer), Sam Ortiz (Engineer). Tickets: NWD-142 Checkout timeout, NWD-156 Leave approvals / Bulk-approve leave requests, NWD-181 CSV export. PR #318 "Fix export encoding". Avatars = coloured circles with initials. Never any real company, person, repo, URL.

## Colour blocks
blue #DCE8FF · mint #D6F5E3 · butter #FFF1C2 · coral #FFDCD2 · sky #D9F2FF · slate #E7E9F0. Accent #2563EB, green #16A34A, amber #D97706 (fill #FEF3C7 / text #92400E), red #DC2626 (fill #FEE2E2 / text #991B1B).

---

## Frame 01 — `01-everywhere` · 8.0s
Words: Your@0.30 product@0.51 lives@1.02 everywhere.@1.45 Tickets.@2.30 Pull@3.07 requests.@3.29 Test@4.05 sheets.@4.35 Customer@4.86 notes.@5.33 And@5.89 none@6.19 of@6.40 it@6.49 talks@6.57 to@6.83 each@6.96 other.@7.04
- Warm white stage (radial like frame 02). 0.3–1.9: huge display word "Everywhere." centered (150px), words-in pop. At 2.1 it scales to ~0.45 and moves to top center (y≈110) as an eyebrow-headline.
- Four scattered, slightly rotated product cards pop in ON their word (Canva pop, expo.out), spread across the frame at different depths/scales:
  - 2.30 Ticket card (blue block): "NWD-142" key chip, "Checkout timeout", status pill "In progress", assignee avatar MR.
  - 3.07 Pull-request card (slate): branch glyph, "PR #318", "Fix export encoding", "+42 −7" green/red, "Open".
  - 4.05 Test sheet card (mint): mini spreadsheet 4 rows (TC-12 Pass, TC-13 Pass, TC-14 Fail red, TC-15 Pass) with header "Release 2.4 · QA".
  - 4.86 Customer note (butter, sticky-note look): quote "Can managers approve leave in bulk?" — "Customer call".
- Each card has a gentle independent drift after landing (small x/y, linear, NOT yoyo).
- 6.2–7.4 "none of it talks": dashed connector lines draw between neighbouring cards, then each SNAPS at the middle (two halves pull apart, turn red #DC2626, fade) on "talks"/"other". Small red "×" pops at each break. Slow push-in 1.0→1.04 over the whole shot.

## Frame 03 — `03-home` · 5.4s
Words: Open@0.26 it,@0.51 and@0.85 you@1.02 already@1.15 know@1.58 what@1.71 matters@1.83 today.@2.18 Every@2.90 signal,@3.24 with@3.80 its@3.97 source.@4.10
- Sky block, app window tilts flat (like 04) at 0.05. Header: logo + "Home", right "Northwind Labs".
- 0.4 greeting "Good morning, Ava" (44px) + muted "Thursday · Sprint 24, day 8".
- 0.9–1.5 four metric tiles pop staggered: "Open in sprint 38", "Blocked 3" (red number), "Due this week 12", "PRs merged 17".
- 1.8 "Needs your attention" card slides up: amber row "NWD-142 blocked 4 days — release review Thursday".
- 2.9 + 3.24 two more insight rows: "3 QA cases failing on CSV export" (red dot), "Leave approvals has no acceptance criteria" (amber dot).
- 3.8–4.2 each row gets a source chip popping at its right: "Jira · NWD-142", "QA sheet · TC-14", "Jira · NWD-156".
- Camera push (scale ~1.3) onto the insight card + its source chips from 3.6 to 5.4; a blue focus ring on the first source chip at 4.1.

## Frame 05 — `05-sprint-health` · 6.3s
Words: Sprint@0.30 health,@0.64 at@1.15 a@1.32 glance.@1.41 What's@2.43 moving,@2.69 what's@3.29 stuck,@3.58 and@4.10 what's@4.31 trending@4.52 the@4.95 wrong@5.04 way.@5.29
- Blue block, dashboard window. Header "Sprint 24 · Jira dashboard".
- 0.4–1.5 status bar fills left→right in three segments: Done 46% green, In progress 31% blue, To do 23% grey, with labels.
- 2.43–2.9 "Moving" tile: "Done this week 21" with green up-arrow count-up.
- 3.29–3.7 "Stuck" tile: "Blocked 3" red, three tiny avatar dots.
- 4.3–5.4 "Created vs resolved" line chart (SVG): two lines draw (stroke-dashoffset), the red "created" line crosses above the green "resolved" line near the end; red callout pill "Bugs created ↑ 18%" pops at 5.1 at the crossing.
- Issues-by-type mini bars (Story/Bug/Task) rise at 1.5–2.2 as supporting detail.
- Camera push onto the chart 4.3→6.3.

## Frame 06 — `06-release-check` · 6.9s
Words: Your@0.30 QA@0.47 sheet@0.85 becomes@1.11 a@1.36 live@1.54 release@1.79 check.@2.13 Ninety-six@2.90 percent@3.46 passing.@3.80 Three@4.61 blockers,@4.91 named.@5.67
- Mint block. 0.3 a small spreadsheet chip "release-2.4-qa.xlsx · 312 cases" morphs/slides into a QA dashboard window by 1.6 ("becomes").
- 1.8 header "Release 2.4 · Ready for release?" + release progress bar "Executed 97.7%".
- 2.9–3.9 BIG ring gauge counts up 0→96% (green arc via stroke-dashoffset; the number counts with snapping integers), label "passing". This is a signature moment — ring ~360px.
- 4.61–5.2 three blocker rows slide in staggered, red "Blocked" pill each: "Bulk leave approval · NWD-156", "CSV export encoding · NWD-181", "Checkout timeout · NWD-142".
- 5.67 owner avatars + names pop onto each row: Priya Shah, Marcus Reid, Sam Ortiz.
- Camera push onto the blocker list 5.2→6.9.

## Frame 07 — `07-standup` · 6.9s
Words: Run@0.26 standup@0.56 in@0.94 one@1.07 place.@1.20 Who's@1.83 in,@2.09 what@2.56 moved,@2.77 what's@3.41 blocked,@3.63 and@4.18 an@4.52 AI@4.65 summary@4.95 of@5.38 what@5.50 needs@5.67 you.@5.93
- Butter block, window "Daily Standup" + "Thursday · Sprint 24".
- 0.4–1.2 KPI strip pops: Team 8 · Present 7 · Absent 1 (amber) · Blocked 3 (red) · Follow-ups 5.
- Left area: four team cards (avatar, name, role): Ava Chen PM, Marcus Reid Engineer, Priya Shah QA, Leo Park Designer.
- 1.83–2.3 "Who's in": presence chips flip on each card (green "Present"; Leo amber "Absent").
- 2.56–3.0 "what moved": each present card reveals two short lines "Yesterday: …" / "Today: …" (e.g. Marcus: "Shipped PR #318" / "CSV export fix").
- 3.41–3.8 "blocked": red chip on Marcus "Blocked · waiting on API keys".
- 4.5–5.3 "AI Daily Summary" card slides in from the right (accent border): four labelled sections, one item each — Attention needed "NWD-142 blocked 4 days", Delivery risk "CSV export may slip", Carry-over "Release notes draft", PM actions "Get API keys to Marcus today".
- Camera push onto "PM actions" 5.4→6.9 with blue focus ring at 5.9.

## Frame 08 — `08-follow-ups` · 6.8s
Words: And@0.30 the@0.43 work@0.60 that@0.72 never@0.90 makes@1.28 it@1.49 into@1.58 Jira?@1.79 Every@2.65 follow-up,@2.90 with@3.58 an@3.75 owner@3.84 and@4.18 a@4.39 due@4.48 date.@4.65 Nothing@5.21 slips.@5.50
- Coral block, window "Follow-ups" + muted subtitle "Work you assigned that isn't in Jira".
- 1.3–1.9 chip "Not in Jira" pops by the title (with a small crossed-out ticket glyph).
- 2.65–3.3 four rows drop in staggered: "Share pricing feedback with design", "Confirm vendor demo slot", "Send release notes draft", "Book usability sessions".
- 3.84 owner avatar+name pops per row (Priya Shah, Marcus Reid, Ava Chen, Leo Park).
- 4.48 due chip per row: "Thu", "Yesterday", "Today", "Mon".
- 4.9–5.3 row 2 status flips to amber "Overdue" (row tint warms), row 3 checkbox checks → green "Completed" with strikethrough.
- 5.21 short display headline "Nothing slips." (110px) pops at the top-left of the coral block above the window; camera eases out slightly to frame headline + list.

## Frame 09 — `09-connected` · 4.2s
Words: Connect@0.30 Jira,@0.64 GitHub,@1.36 and@1.96 Gemini@2.09 in@2.65 minutes.@2.82
- Sky block. Window "Connections". Three large connector cards side by side (each ~480px): glyph tile + name + description: "Jira — Issues, sprints, epics" (blue glyph), "GitHub — Repos, commits, PRs" (dark glyph), "Gemini — Reasoning model" (sky glyph). Generic glyphs only.
- Each card pops in at ~0.3 staggered with a grey "Connect" button; button flips (press scale 0.92→1) to green "Connected ✓" exactly on 0.64 / 1.36 / 2.09.
- 2.7 chip "Set up in 2 minutes" pops below. Slow push 1→1.05.

## Frame 10 — `10-keystroke` · 3.8s  (fastest beat)
Words: Then@0.30 everything@0.77 is@1.45 one@1.58 keystroke@2.05 away.@2.65
- White stage. 0.2 two huge 3D keycaps "Ctrl" + "K" (≈260px tall, white, thick bottom shadow) center; they press down (y+14, shadow shrinks) at 0.77 and release.
- 1.1 keys scale away/fade; command palette (white modal, 1100px wide) drops in from y-40 with blur-free expo; search field types "NWD-156" 1.3–1.9.
- 1.9–2.3 results list: "NWD-156 · Leave approvals" (highlighted, accent bg tint), "Sprint 24 board", "Release 2.4 QA dashboard", "Daily standup".
- 2.65 "↵ Open" key hint pulses once on the highlighted row. Quick push 1→1.06.

## Frame 11 — `11-you-decide` · 6.8s  (the most important held read)
Words: And@0.34 nothing@0.47 touches@0.90 Jira@1.24 until@1.62 you@1.88 say@2.05 so.@2.22 PM@3.24 Agent@3.63 drafts.@3.97 You@4.78 decide.@4.95
- Butter-to-white. Draft story card window "Drafts" (follow the CLAUDE.md user-story template): title "Bulk-approve leave requests"; line "As a team manager, I want to approve several leave requests at once, so that my team isn't kept waiting."; Acceptance criteria box: "Given 5 pending requests · When I select all and approve · Then all 5 are approved and each employee is notified"; tag pill "needs triage"; source "Source: customer call".
- 0.5–1.4 card assembles (title, story line, AC box stagger).
- 1.6 amber banner slides in at top of card: "Human approval required — nothing is written to Jira until you approve".
- 3.24 chip "Drafted by PM Agent" (logo mark mini) pops.
- 4.5 "Approve" button (accent) gets a press (scale 0.94→1) at 4.78; small confirm popover "Create NWD-190 in Jira?" with "Confirm" pressed at 5.05; green stamp "Approved" lands on the card at 5.2.
- 5.5–6.8: card blurs back (filter blur 0→8px, scale 0.92, opacity 0.25) and huge display "You decide." (150px, ink) rises centered — hold still.

## Frame 12 — `12-built-for-pms` · 5.9s
Words: Stories.@0.26 PRDs.@1.15 Feedback@2.22 turned@2.77 into@3.03 work.@3.24 All@3.80 in@4.14 your@4.22 team's@4.35 templates.@4.65
- White stage, 3x2 grid of colourful tiles (each ~520x300, own block colour, icon, title, 2 mini skeleton lines that look like the template):
  0.26 "User story" (blue), 1.15 "PRD" (butter) + 1.35 "BRD" (sky), 2.22 "Feedback → story" (coral, arrow animates), 2.9 "Health check" (mint), 3.2 "Standup summary" (slate).
- 3.8–4.8 every tile gets a small "Template ✓" chip popping in sequence.
- Slow zoom-out 1.08→1.0 across the shot (grid-card-assemble).

## Frame 13 — `13-outro` · 7.0s  (final frame — holds)
Words: PM@0.30 Agent.@0.68 Connect@1.49 everything.@1.92 Understand@2.69 anything.@3.29 Move@4.01 product@4.35 forward.@4.74
- Warm white stage. 0.2–0.9 the logo mark builds: the three paths of the mark (viewBox 0 0 16 16, from frame 02) DRAW on via stroke-dashoffset at large size (~180px) in ink, converging; the dot pops at 0.8; then a dark rounded square (#111, radius 52/200) scales in behind and the strokes turn white — lockup with wordmark "PM Agent" (96px, 750) beside or below at 0.7.
- Three tagline lines stacked below, each popping on its word: "Connect everything." 1.49, "Understand anything." 2.69, "Move product forward." 4.01 (last one in accent #2563EB). 48–56px weight 650.
- 4.9 footer (y≈860) muted 20px: "Product UI shown with demo data".
- Then still hold to the end (no drift).
