"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, Sparkles, ShieldCheck, Unplug, Lock, GitBranch } from "lucide-react";

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
      <div className="flex h-full items-center justify-center p-4">
        <motion.form
          onSubmit={unlock}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="card-surface w-full max-w-xs rounded-2xl p-5 text-center"
        >
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Lock size={16} />
          </div>
          <div className="mb-1 text-sm font-semibold">Re-enter your password</div>
          <p className="mb-4 text-xs text-fg/50">
            The Connector holds your Jira, Gemini, and GitHub credentials, so it asks again every time.
          </p>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mb-3 w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
          />
          {unlockError && <div className="mb-3 text-xs text-red-300">{unlockError}</div>}
          <button
            type="submit"
            disabled={unlocking || !password}
            className="btn w-full rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {unlocking ? "Checking…" : "Unlock"}
          </button>
        </motion.form>
      </div>
    );
  }

  return <ConnectorPanelContent />;
}

function ConnectorPanelContent() {
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

  const Badge = ({ configured }: { configured: boolean }) => (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        configured ? "bg-emerald-500/15 text-emerald-300" : "bg-fg/10 text-fg/40"
      }`}
    >
      <motion.span
        className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-400" : "bg-fg/30"}`}
        animate={configured ? { opacity: [1, 0.4, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {configured ? "Connected" : "Not connected"}
    </span>
  );

  const ResultBanner = ({ result }: { result: TestResult }) => (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="overflow-hidden"
        >
          <div
            className={`mt-2 rounded-md border px-3 py-2 text-xs ${
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {result.detail}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-fg/[0.06] p-4">
        <h1 className="text-panel-title">Connector</h1>
        <p className="text-sm text-fg/50">
          Connect your own Jira site, Gemini API key, and a read-only GitHub repo. Credentials are
          stored locally by this app instance — nothing is sent anywhere except Jira, Google's
          Gemini API, and GitHub directly.
        </p>
      </div>

      <div className="space-y-6 p-4">
        {/* Jira */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="card-surface rounded-xl p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <Plug size={16} className="text-fg/50" />
              Jira
            </div>
            {status && <Badge configured={status.jira.configured} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-fg/50">Site URL</div>
              <input
                value={jiraBaseUrl}
                onChange={(e) => setJiraBaseUrl(e.target.value)}
                placeholder="https://your-domain.atlassian.net"
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-fg/50">Account email</div>
              <input
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-fg/50">
                API token{" "}
                {status?.jira.apiTokenMasked && (
                  <span className="text-fg/30">(current: {status.jira.apiTokenMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={jiraToken}
                onChange={(e) => setJiraToken(e.target.value)}
                placeholder={status?.jira.apiTokenMasked ? "Leave blank to keep current token" : "Paste your Jira API token"}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={saveJira}
              disabled={savingJira || !jiraBaseUrl || !jiraEmail}
              className="btn rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingJira ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => test("jira")}
              disabled={testingJira || !status?.jira.configured}
              className="btn flex items-center gap-1.5 rounded-md border border-fg/10 px-4 py-1.5 text-sm text-fg/70 hover:bg-fg/5 disabled:opacity-50"
            >
              <ShieldCheck size={13} />
              {testingJira ? "Testing…" : "Test connection"}
            </button>
            {status?.jira.configured && (
              <button
                onClick={() => disconnect("jira")}
                className="btn flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm text-fg/40 hover:text-red-300"
              >
                <Unplug size={13} />
                Disconnect
              </button>
            )}
          </div>
          <ResultBanner result={jiraTest} />
          <div className="mt-2 text-xs text-fg/30">
            Create a token at Atlassian account → Security → API tokens.
          </div>
        </motion.div>

        {/* Gemini */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.05 }}
          className="card-surface rounded-xl p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles size={16} className="text-fg/50" />
              Gemini
            </div>
            {status && <Badge configured={status.gemini.configured} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-fg/50">
                API key{" "}
                {status?.gemini.apiKeyMasked && (
                  <span className="text-fg/30">(current: {status.gemini.apiKeyMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={status?.gemini.apiKeyMasked ? "Leave blank to keep current key" : "Paste your Gemini API key"}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-fg/50">Model</div>
              <input
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                placeholder="gemini-3.5-flash-lite"
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={saveGemini}
              disabled={savingGemini}
              className="btn rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingGemini ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => test("gemini")}
              disabled={testingGemini || !status?.gemini.configured}
              className="btn flex items-center gap-1.5 rounded-md border border-fg/10 px-4 py-1.5 text-sm text-fg/70 hover:bg-fg/5 disabled:opacity-50"
            >
              <ShieldCheck size={13} />
              {testingGemini ? "Testing…" : "Test connection"}
            </button>
            {status?.gemini.configured && (
              <button
                onClick={() => disconnect("gemini")}
                className="btn flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm text-fg/40 hover:text-red-300"
              >
                <Unplug size={13} />
                Disconnect
              </button>
            )}
          </div>
          <ResultBanner result={geminiTest} />
          <div className="mt-2 text-xs text-fg/30">Get a key from Google AI Studio.</div>
        </motion.div>

        {/* GitHub */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3, delay: 0.1 }}
          className="card-surface rounded-xl p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <GitBranch size={16} className="text-fg/50" />
              GitHub
            </div>
            {status && <Badge configured={status.github.configured} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-fg/50">Repository</div>
              <input
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="owner/repo or a github.com link"
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-fg/50">
                Personal access token{" "}
                {status?.github.tokenMasked && (
                  <span className="text-fg/30">(current: {status.github.tokenMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder={status?.github.tokenMasked ? "Leave blank to keep current token" : "Paste a read-only fine-grained PAT"}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 outline-none transition-colors focus:border-accent"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={saveGithub}
              disabled={savingGithub || !githubRepo}
              className="btn rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingGithub ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => test("github")}
              disabled={testingGithub || !status?.github.configured}
              className="btn flex items-center gap-1.5 rounded-md border border-fg/10 px-4 py-1.5 text-sm text-fg/70 hover:bg-fg/5 disabled:opacity-50"
            >
              <ShieldCheck size={13} />
              {testingGithub ? "Testing…" : "Test connection"}
            </button>
            {status?.github.configured && (
              <button
                onClick={() => disconnect("github")}
                className="btn flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm text-fg/40 hover:text-red-300"
              >
                <Unplug size={13} />
                Disconnect
              </button>
            )}
          </div>
          <ResultBanner result={githubTest} />
          <div className="mt-2 text-xs text-fg/30">
            Create a fine-grained, read-only token at GitHub → Settings → Developer settings.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
