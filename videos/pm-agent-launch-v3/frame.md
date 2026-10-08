---
name: pm-agent-canva-apple
canvas: "#F7F7F5"
colors:
  canvas: "#F7F7F5"      # warm white stage
  surface: "#FFFFFF"     # cards / app windows
  ink: "#111111"         # display + body text
  muted: "#6B7280"       # secondary text
  hairline: "#E5E7EB"    # 1px borders
  accent: "#2563EB"      # the one blue: connectors, focus, key number
  positive: "#16A34A"    # connected / pass / approved
  warning: "#D97706"     # at risk / overdue
  danger: "#DC2626"      # blocked
  # Canva colour blocks — scene backdrops and source/feature tiles only
  block-blue: "#DCE8FF"
  block-mint: "#D6F5E3"
  block-butter: "#FFF1C2"
  block-coral: "#FFDCD2"
  block-sky: "#D9F2FF"
fonts:
  display: Inter (assets/fonts/Inter-Variable.woff2)
  body: Inter
---

# PM Agent — Canva x Apple launch look

## Stage
- Canvas `#F7F7F5` with one soft radial light (white at centre). Each scene may sit on ONE colour block (rounded 48px panel or full-bleed) from the block palette; never two blocks competing.
- No purple/violet "AI" gradients, no sparkles, particles, bokeh, stock imagery, browser chrome or real cursor.

## Type (Inter only)
- Display: 120–160px, weight 700, tracking -0.04em, sentence case, 2–5 words.
- Headline: 56–72px, weight 650, tracking -0.03em.
- UI text inside product windows: never below 20px at its hero moment; labels 20–22px, body 24–28px, titles 36–44px.
- Eyebrow: 22px, weight 600, uppercase, tracking 0.12em, muted.

## Product UI (rebuilt in HTML, demo data only)
- App window: white, 28px radius, 1px hairline, layered shadow `0 2px 4px rgba(17,17,17,.04), 0 40px 80px -20px rgba(17,17,17,.25)`.
- Cards inside: 18px radius, hairline border. Chips/pills: 999px radius, 20px text, tinted fill + darker text of same hue.
- Logo mark: dark rounded square (#111) with the three converging white lines + dot (from IntelligenceLayer.tsx Logo, viewBox 0 0 16 16).
- Status colours only where they mean something: green connected/pass, amber at risk/overdue, red blocked.

## Motion
- Canva pop: pieces enter staggered (0.06–0.12s), scale 0.9→1 + y 24→0 + opacity, `expo.out` 0.7s. No bounce, no overshoot, no yoyo/repeat.
- Apple camera: one slow continuous push per shot (`power2.inOut`), optional 3D tilt-to-flat entrance (rotateX 10°→0).
- Lines draw via stroke-dashoffset, `power3.inOut`.
- Reveals land on the voiceover word; back half of each shot carries the key reveal.

## Layout
- 1920x1080; all content above y=900 (caption band kept clear).
- Fictional workspace only: Northwind Labs · project NWD · Sprint 24 · Ava Chen, Marcus Reid, Priya Shah.
