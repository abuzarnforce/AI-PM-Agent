"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, Sparkles, ShieldCheck, Unplug, Lock, GitBranch, FileSpreadsheet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNav } from "@/lib/nav";
import { Badge, Button, Field, PageHeader, Section, inputCls } from "./ui";
import IntelligenceLayer from "./IntelligenceLayer";

interface Status {
  jira: { baseUrl: string; email: string; apiTokenMasked: string; configured: boolean };
  gemini: { model: string; apiKeyMasked: string; configured: boolean };
  github: { repo: string; tokenMasked: string; configured: boolean };
}

type TestResult = { ok: boolean; detail: string } | null;

/** Jira/Gemini/GitHub credentials live here, so re-confirm the signed-in user's password
 * every time this tab is opened — not just once per session. The component fully unmounts
 * when the PM navigates to another tab (see page.tsx's tab switch), so this gate state
 * naturally resets on every visit. */
export default function ConnectorPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUnlocked(true);
    } catch (err: any) {
      setUnlockError(err.message ?? "Something went wrong");
    } finally {
      setUnlocking(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center p-4">
        <motion.form
          onSubmit={unlock}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-xl border border-border bg-panel p-6"
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted">
            <Lock size={16} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Confirm it's you</h1>
          <p className="mb-5 mt-1 text-sm text-muted">
            Connections hold your Jira, Gemini and GitHub credentials, so PM Agent asks for your password each time.
          </p>
          <input
            autoFocus
            type="password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={`${inputCls} mb-3`}
          />
          {unlockError && (
            <div role="alert" className="mb-3 text-xs text-red-400">
              {unlockError}
            </div>
          )}
          <Button type="submit" variant="primary" loading={unlocking} disabled={!password} className="w-full">
            Unlock
          </Button>
        </motion.form>
      </div>
    );
  }

  return <ConnectorPanelContent />;
}

function ConnectorPanelContent() {
  const { navigate } = useNav();
  const [status, setStatus] = useState<Status | null>(null);

  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash-lite");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");

  const [savingJira, setSavingJira] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [savingGithub, setSavingGithub] = useState(false);
  const [testingJira, setTestingJira] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [jiraTest, setJiraTest] = useState<TestResult>(null);
  const [geminiTest, setGeminiTest] = useState<TestResult>(null);
  const [githubTest, setGithubTest] = useState<TestResult>(null);

  async function load() {
    const res = await fetch("/api/connector");
    const data: Status = await res.json();
    setStatus(data);
    setJiraBaseUrl(data.jira.baseUrl);
    setJiraEmail(data.jira.email);
    setGeminiModel(data.gemini.model || "gemini-3.5-flash-lite");
    setGithubRepo(data.github.repo);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveJira() {
    setSavingJira(true);
    setJiraTest(null);
    try {
      await fetch("/api/connector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jira: { baseUrl: jiraBaseUrl, email: jiraEmail, apiToken: jiraToken || undefined },
        }),
      });
      setJiraToken("");
      await load();
    } finally {
      setSavingJira(false);
    }
  }

  async function saveGemini() {
    setSavingGemini(true);
    setGeminiTest(null);
    try {
      await fetch("/api/connector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gemini: { apiKey: geminiKey || undefined, model: geminiModel },
        }),
      });
      setGeminiKey("");
      await load();
    } finally {
      setSavingGemini(false);
    }
  }

  async function saveGithub() {
    setSavingGithub(true);
    setGithubTest(null);
    try {
      await fetch("/api/connector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github: { repo: githubRepo, token: githubToken || undefined },
        }),
      });
      setGithubToken("");
      await load();
    } finally {
      setSavingGithub(false);
    }
  }

  async function disconnect(kind: "jira" | "gemini" | "github") {
    await fetch("/api/connector", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (kind === "jira") {
      setJiraBaseUrl("");
      setJiraEmail("");
      setJiraToken("");
      setJiraTest(null);
    } else if (kind === "gemini") {
      setGeminiKey("");
      setGeminiTest(null);
    } else {
      setGithubRepo("");
      setGithubToken("");
      setGithubTest(null);
    }
    await load();
  }

  async function test(target: "jira" | "gemini" | "github") {
    const setTesting = target === "jira" ? setTestingJira : target === "gemini" ? setTestingGemini : setTestingGithub;
    const setResult = target === "jira" ? setJiraTest : target === "gemini" ? setGeminiTest : setGithubTest;
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/connector/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      setResult(await res.json());
    } catch (err: any) {
      setResult({ ok: false, detail: err.message ?? "Test failed" });
    } finally {
      setTesting(false);
    }
  }


  return (
    <div className="page">
      <PageHeader
        eyebrow="Connections"
        title="Connect everything."
        description="PM Agent reads from these services on your behalf. Credentials stay with this app and are only ever sent to the service they belong to."
      />

      <div className="mb-12 rounded-xl border border-border bg-panel px-4 py-6 sm:px-8">
        <IntelligenceLayer
          live={{
            Jira: !!status?.jira.configured,
            GitHub: !!status?.github.configured,
            QA: true,
            Feedback: !!status?.gemini.configured,
            Analytics: false,
          }}
        />
      </div>

      <div className="divide-hairline border-y border-border">
        <Integration
          name="Jira"
          blurb="Issues, epics and sprints. The source for answers, health checks and duplicate detection — and the only place approved drafts are written."
          icon={Plug}
          configured={status?.jira.configured}
          detail={status?.jira.configured ? status.jira.baseUrl : undefined}
          onSave={saveJira}
          saving={savingJira}
          saveDisabled={!jiraBaseUrl || !jiraEmail}
          onTest={() => test("jira")}
          testing={testingJira}
          onDisconnect={() => disconnect("jira")}
          result={jiraTest}
          help="Create a token at Atlassian account → Security → API tokens."
        >
          <Field label="Site URL">
            <input value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} placeholder="https://your-domain.atlassian.net" className={inputCls} />
          </Field>
          <Field label="Account email">
            <input value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
          </Field>
          <Field label="API token" hint={status?.jira.apiTokenMasked ? `current: ${status.jira.apiTokenMasked}` : undefined} className="sm:col-span-2">
            <input
              type="password"
              value={jiraToken}
              onChange={(e) => setJiraToken(e.target.value)}
              placeholder={status?.jira.apiTokenMasked ? "Leave blank to keep current token" : "Paste your Jira API token"}
              className={inputCls}
            />
          </Field>
        </Integration>

        <Integration
          name="Gemini"
          blurb="The reasoning engine behind answers, drafts and verdicts."
          icon={Sparkles}
          configured={status?.gemini.configured}
          detail={status?.gemini.configured ? status.gemini.model : undefined}
          onSave={saveGemini}
          saving={savingGemini}
          onTest={() => test("gemini")}
          testing={testingGemini}
          onDisconnect={() => disconnect("gemini")}
          result={geminiTest}
          help="Get a key from Google AI Studio."
        >
          <Field label="API key" hint={status?.gemini.apiKeyMasked ? `current: ${status.gemini.apiKeyMasked}` : undefined}>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={status?.gemini.apiKeyMasked ? "Leave blank to keep current key" : "Paste your Gemini API key"}
              className={inputCls}
            />
          </Field>
          <Field label="Model">
            <input value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} placeholder="gemini-3.5-flash-lite" className={inputCls} />
          </Field>
        </Integration>

        <Integration
          name="GitHub"
          blurb="Read-only commit and Pull Request activity for one repository."
          icon={GitBranch}
          configured={status?.github.configured}
          detail={status?.github.configured ? status.github.repo : undefined}
          onSave={saveGithub}
          saving={savingGithub}
          saveDisabled={!githubRepo}
          onTest={() => test("github")}
          testing={testingGithub}
          onDisconnect={() => disconnect("github")}
          result={githubTest}
          help="Create a fine-grained, read-only token at GitHub → Settings → Developer settings."
        >
          <Field label="Repository">
            <input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="owner/repo or a github.com link" className={inputCls} />
          </Field>
          <Field label="Personal access token" hint={status?.github.tokenMasked ? `current: ${status.github.tokenMasked}` : undefined}>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder={status?.github.tokenMasked ? "Leave blank to keep current token" : "Paste a read-only fine-grained PAT"}
              className={inputCls}
            />
          </Field>
        </Integration>

        <div className="flex flex-wrap items-center gap-4 py-6">
          <IntegrationTitle icon={FileSpreadsheet} name="QA spreadsheets" blurb="Excel workbooks with Regression, Testcase_Tracker and Automation_Scenarios sheets." />
          <Button onClick={() => navigate("health", { subtab: "qa" })}>Manage in Health → QA</Button>
        </div>
      </div>

      <Section title="Coming soon" description="Not available yet — listed so you know what's planned." className="!mt-14">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["Slack", "Confluence", "Analytics", "CRM"].map((n) => (
            <div key={n} className="flex items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
              {n}
              <Badge>Soon</Badge>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function IntegrationTitle({
  icon: Icon,
  name,
  blurb,
  configured,
  detail,
}: {
  icon: LucideIcon;
  name: string;
  blurb: string;
  configured?: boolean;
  detail?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-panel">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{name}</span>
          {configured !== undefined && (
            <Badge tone={configured ? "green" : "neutral"} dot>
              {configured ? "Connected" : "Not connected"}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted">{blurb}</p>
        {detail && <div className="mt-1 truncate text-xs text-subtle">{detail}</div>}
      </div>
    </div>
  );
}

function Integration({
  name,
  blurb,
  icon,
  configured,
  detail,
  children,
  onSave,
  saving,
  saveDisabled,
  onTest,
  testing,
  onDisconnect,
  result,
  help,
}: {
  name: string;
  blurb: string;
  icon: LucideIcon;
  configured?: boolean;
  detail?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  saveDisabled?: boolean;
  onTest: () => void;
  testing: boolean;
  onDisconnect: () => void;
  result: TestResult;
  help: string;
}) {
  const [open, setOpen] = useState(false);
  const expanded = open || configured === false;
  return (
    <div className="py-6">
      <div className="flex flex-wrap items-start gap-4">
        <IntegrationTitle icon={icon} name={name} blurb={blurb} configured={configured} detail={detail} />
        {configured && (
          <div className="flex gap-2">
            <Button icon={ShieldCheck} loading={testing} onClick={onTest}>
              Test connection
            </Button>
            <Button variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={expanded}>
              {expanded ? "Close" : "Configure"}
            </Button>
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {result && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div
              role="status"
              className={`mt-3 rounded-md border px-3 py-2 text-xs sm:ml-14 ${
                result.ok ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400" : "border-red-500/25 bg-red-500/[0.06] text-red-400"
              }`}
            >
              {result.ok ? "Healthy — " : "We couldn’t connect — "}
              {result.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 sm:ml-14">
              <div className="grid gap-4 sm:grid-cols-2">{children}</div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="primary" loading={saving} disabled={saveDisabled} onClick={onSave}>
                  Save
                </Button>
                {configured && (
                  <Button variant="ghost" icon={Unplug} onClick={onDisconnect} className="hover:!text-red-400">
                    Disconnect
                  </Button>
                )}
                <span className="text-xs text-subtle">{help}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
