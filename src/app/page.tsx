import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Command,
  FileText,
  GitBranch,
  Inbox,
  KeyRound,
  Lock,
  Map,
  MailCheck,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import IntelligenceLayer, { Logo } from "@/components/IntelligenceLayer";
import ThemeToggle from "@/components/ThemeToggle";
import { Film, WatchButton, type ChapterId } from "@/components/landing/Film";

export const metadata = {
  title: "PM Agent — the intelligent layer for product teams",
  description:
    "PM Agent reads Jira, GitHub, QA sheets and feedback, reasons across them, and drafts the stories, PRDs and updates a PM would otherwise write by hand. Nothing reaches Jira until you approve it.",
};

const TRY = "/app";

const SHOWCASE: { chapter: ChapterId; img: string; eyebrow: string; title: string; body: string; points: string[] }[] = [
  {
    chapter: "home",
    img: "/landing/f03.jpg",
    eyebrow: "Home",
    title: "Know what matters before your first meeting.",
    body: "Open PM Agent and the day is already triaged: open bugs, blockers, overdue work and what changed overnight — each signal linked to the ticket behind it.",
    points: ["Needs-your-attention list ranked by impact", "Sprint, release and QA numbers on one screen", "Every number clicks through to its source"],
  },
  {
    chapter: "ask",
    img: "/landing/f04.jpg",
    eyebrow: "Ask anything",
    title: "Ask in plain English. Get answers with receipts.",
    body: "“Is Sprint 24 on track?” PM Agent searches Jira, checks the QA sheet, reasons it through and shows its work — which issues it read and why they matter.",
    points: ["Answers cite ticket IDs and spreadsheet rows", "Says “I don't know” instead of guessing", "Offers to go deeper instead of dumping everything"],
  },
  {
    chapter: "sprint",
    img: "/landing/f05.jpg",
    eyebrow: "Sprint health",
    title: "What's moving, what's stuck, what's drifting.",
    body: "A health check for any epic or sprint: stories missing acceptance criteria, unestimated work, stale tickets, scope drift and QA gaps — ending in a one-line verdict.",
    points: ["On track · at risk · blocked, with the reason", "Scope drift measured against the epic's original intent", "Stale threshold you set, not a magic number"],
  },
  {
    chapter: "release",
    img: "/landing/f06.jpg",
    eyebrow: "Release check",
    title: "Your QA sheet becomes a live release gate.",
    body: "Drop in the Excel test sheet. PM Agent normalises every row, links it to its story, and tells you exactly what stands between you and shipping.",
    points: ["Pass rate and ready-for-deployment percentage", "Blockers named, each linked to its Jira ticket", "Ambiguous row-to-story matches flagged, never guessed"],
  },
  {
    chapter: "standup",
    img: "/landing/f07.jpg",
    eyebrow: "Daily standup",
    title: "Run standup in one place.",
    body: "Who's in, who's out, what moved since yesterday, what's blocked — and an AI summary of the few things that genuinely need you.",
    points: ["Attendance and updates per teammate", "Blockers surfaced with owners", "Summary you can paste straight into Slack"],
  },
  {
    chapter: "followups",
    img: "/landing/f08.jpg",
    eyebrow: "Follow-ups",
    title: "The work that never makes it into Jira — tracked.",
    body: "Promises made in meetings and threads get an owner, a due date and a home. Nothing slips because nobody wrote it down.",
    points: ["Captured from notes, demos and standups", "Owner, due date and source on every item", "Overdue items rise to Home automatically"],
  },
];

const MORE: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: FileText, title: "Studio", body: "Draft user stories, PRDs and BRDs from a brief — always in your team's exact templates, with a duplicate check first." },
  { icon: Inbox, title: "Feedback capture", body: "Paste a customer comment or call transcript. Get the underlying request, a duplicate check, and a ready-to-triage story." },
  { icon: Map, title: "Roadmap", body: "A PM-owned Now / Next / Later plan that sits alongside Jira's execution data instead of fighting it." },
  { icon: GitBranch, title: "Repo activity", body: "Pull requests and commits from GitHub, tied back to the stories they deliver." },
  { icon: Command, title: "One keystroke away", body: "⌘K jumps to any ticket, board, dashboard or action. Power users never touch the mouse." },
  { icon: ClipboardCheck, title: "Drafts queue", body: "Everything the agent writes waits here, tagged needs-triage, until a human approves or rejects it." },
];

const SECURITY: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: MailCheck, title: "Passwordless sign-in", body: "Continue with Google or Microsoft, or get a one-time code by email. The first time you use Google or Microsoft, we also email you a code to confirm the address really is yours." },
  { icon: Users, title: "Private workspaces", body: "Every team gets its own workspace. Your Jira, GitHub, QA sheets, drafts and keys are never visible to anyone outside it." },
  { icon: UserCog, title: "Admin & member roles", body: "Admins invite people, manage roles and own the integrations. Removing someone signs them out on their next request." },
  { icon: KeyRound, title: "Step-up for credentials", body: "Viewing or changing Jira, AI or GitHub keys needs a fresh emailed code — even if you're already signed in." },
  { icon: Lock, title: "Locked-down sessions", body: "Signed, HTTP-only, same-site cookies. Every API call is checked server-side, and cross-site requests are refused." },
  { icon: ShieldCheck, title: "Human in the loop", body: "The agent drafts; it never writes to Jira on its own. Every claim it makes cites the ticket or row behind it." },
];

const FAQ = [
  {
    q: "Can other teams using PM Agent see our data?",
    a: "No. Every team works in its own private workspace. Your Jira, GitHub and AI connections, drafts, QA sheets, roadmap and standups are stored separately and are never visible to anyone outside your workspace.",
  },
  {
    q: "Will PM Agent change anything in Jira by itself?",
    a: "No. Creating or updating issues always produces a draft first. It lands in your Drafts queue and only reaches Jira when a person approves it.",
  },
  {
    q: "How do people sign in?",
    a: "With Google, Microsoft, or a one-time code sent to their email. There's no password. Anyone can sign up and gets their own private workspace; admins invite their teammates into it.",
  },
  {
    q: "What does it connect to?",
    a: "Jira Cloud, GitHub, Slack and Excel QA sheets, with Gemini or NVIDIA models doing the reasoning. Each integration is set up once by an admin in Connections.",
  },
  {
    q: "Where do answers come from?",
    a: "Only from your connected data. Health checks and chat answers cite the Jira ticket ID or spreadsheet row behind every claim, and say so plainly when the data can't answer a question.",
  },
  {
    q: "Does it follow our templates?",
    a: "Yes. Stories, PRDs, BRDs and health checks follow fixed templates so drafts look like your team wrote them — not like an AI improvised a format.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-bg">
      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-sm font-semibold tracking-tight">PM Agent</span>
          </Link>
          <div className="hidden items-center gap-5 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#security" className="hover:text-fg">Security</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden px-2 text-sm font-medium text-muted hover:text-fg sm:block">
              Sign in
            </Link>
            <Link href={TRY} className="btn inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover">
              Try our agent
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] [background:radial-gradient(60%_60%_at_50%_0%,rgb(var(--color-accent)/0.14),transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted">
              <Sparkles size={12} className="text-accent" />
              The AI product manager assistant
            </div>
            <h1 className="mx-auto max-w-3xl text-[clamp(2.5rem,1.6rem+3.6vw,4.5rem)] font-[650] leading-[1.02] tracking-[-0.045em]">
              Connect everything. Understand anything. Move product forward.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              PM Agent reads your Jira, GitHub, QA sheets and customer feedback, reasons across all of it, and drafts the stories, PRDs and updates
              you'd otherwise write by hand. You stay in control of every change.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={TRY} className="btn inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-hover">
                Try our agent <ArrowRight size={16} />
              </Link>
              <a href="#film" className="btn inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-panel px-5 text-[15px] font-medium hover:bg-fg/[0.04]">
                Watch the film
              </a>
            </div>
            <p className="mt-4 text-xs text-subtle">Google, Microsoft or work email · no password to remember</p>

            <div id="film" className="mx-auto mt-14 max-w-5xl scroll-mt-24">
              <Film />
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="border-y border-border bg-panel/50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-sm font-medium text-muted sm:px-6">
            <span className="eyebrow w-full text-center sm:w-auto">Works with</span>
            {["Jira", "GitHub", "Slack", "Excel QA sheets", "Gemini", "NVIDIA AI"].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </section>

        {/* Problem → layer */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="eyebrow mb-3">The problem</div>
              <h2 className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">Your product lives everywhere. None of it talks to each other.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Tickets in Jira. Code in GitHub. Test results in a spreadsheet. Customer asks in call notes. A PM spends hours stitching them together
                before they can make a single decision.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                PM Agent is one intelligent layer across all of it — turning raw signals into <span className="text-fg">insight</span>,{" "}
                <span className="text-fg">decisions</span> and <span className="text-fg">action</span>.
              </p>
            </div>
            <div className="card-surface rounded-2xl p-6">
              <IntelligenceLayer />
            </div>
          </div>
        </section>

        {/* Feature showcase */}
        <section id="features" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 pt-24 text-center sm:px-6">
            <div className="eyebrow mb-3">Features</div>
            <h2 className="mx-auto max-w-2xl text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">Everything a PM does in a day, in one workspace.</h2>
          </div>
          <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-6">
            {SHOWCASE.map((f, i) => (
              <article key={f.chapter} className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
                <div className={i % 2 ? "lg:order-2" : ""}>
                  <div className="eyebrow mb-3 !text-accent">{f.eyebrow}</div>
                  <h3 className="text-2xl font-[650] leading-tight sm:text-3xl">{f.title}</h3>
                  <p className="mt-4 leading-relaxed text-muted">{f.body}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {f.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <WatchButton chapter={f.chapter}>See it in the film</WatchButton>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border [box-shadow:var(--overlay-shadow)]">
                  <Image src={f.img} alt={`${f.eyebrow} screen in PM Agent (demo data)`} width={1280} height={720} sizes="(min-width: 1024px) 640px, 100vw" className="block h-auto w-full" />
                </div>
              </article>
            ))}
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <h3 className="mb-6 text-xl font-semibold">And the rest of the toolkit</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MORE.map(({ icon: Icon, title, body }) => (
                <div key={title} className="card-surface rounded-xl p-5">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon size={16} />
                  </div>
                  <div className="font-semibold">{title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* You decide */}
        <section className="border-y border-border bg-panel/50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border [box-shadow:var(--overlay-shadow)]">
              <Image src="/landing/f11.jpg" alt="A drafted Jira story waiting for human approval (demo data)" width={1280} height={720} sizes="(min-width: 1024px) 640px, 100vw" className="block h-auto w-full" />
            </div>
            <div>
              <div className="eyebrow mb-3 !text-accent">The one rule</div>
              <h2 className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">PM Agent drafts. You decide.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Nothing touches Jira until you say so. Every story, update and PRD lands in your Drafts queue first — with its source attached and a
                duplicate check already run.
              </p>
              <div className="mt-6">
                <WatchButton chapter="approve">See approvals in the film</WatchButton>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="eyebrow mb-3">How it works</div>
          <h2 className="max-w-2xl text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">From sign-in to your first insight in minutes.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              ["Sign in", "Continue with Google or Microsoft, or use a one-time code sent to your work email. First time? We confirm your email once, and that's onboarding."],
              ["Connect", "An admin links Jira, GitHub and your AI model once. Keys are stored server-side and masked everywhere."],
              ["Ask & review", "Ask questions, run health checks, drop in QA sheets. Every answer cites its sources."],
              ["Approve", "Review the agent's drafts. Approve what's right; it reaches Jira. Reject the rest; nothing happens."],
            ].map(([t, b], i) => (
              <li key={t} className="relative border-t-2 border-border pt-5">
                <span className="tabular text-sm font-semibold text-accent">0{i + 1}</span>
                <div className="mt-2 text-lg font-semibold">{t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="eyebrow mb-3">Security & access</div>
            <h2 className="max-w-2xl text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">Enterprise sign-in, without the password problem.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
              Built the way modern workspace tools handle accounts: your email is your identity, your company controls who's in, and sensitive actions
              ask you to prove it's you again.
            </p>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <Icon size={20} className="text-accent" />
                  <div className="mt-3 font-semibold">{title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
            <h2 className="text-center text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">Questions, answered</h2>
            <div className="mt-10 divide-y divide-border border-y border-border">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-xl leading-none text-muted transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-panel px-6 py-16 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_80%_at_50%_100%,rgb(var(--color-accent)/0.16),transparent)]" />
            <div className="relative">
              <MessageSquare size={24} className="mx-auto text-accent" />
              <h2 className="mx-auto mt-4 max-w-xl text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-[650] leading-tight">Give your product an intelligent workspace.</h2>
              <p className="mx-auto mt-4 max-w-md text-muted">Sign in with your work email and ask your first question in under a minute.</p>
              <Link href={TRY} className="btn mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-hover">
                Try our agent <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-medium text-fg">PM Agent</span>
          </div>
          <span className="text-subtle">Screens shown use demo data.</span>
          <div className="ml-auto flex gap-5">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#security" className="hover:text-fg">Security</a>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
