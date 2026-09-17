"use client";

import { useEffect, useState } from "react";

interface Status {
  jira: { baseUrl: string; email: string; apiTokenMasked: string; configured: boolean };
  gemini: { model: string; apiKeyMasked: string; configured: boolean };
}

type TestResult = { ok: boolean; detail: string } | null;

export default function ConnectorPanel() {
  const [status, setStatus] = useState<Status | null>(null);

  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash-lite");

  const [savingJira, setSavingJira] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [testingJira, setTestingJira] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [jiraTest, setJiraTest] = useState<TestResult>(null);
  const [geminiTest, setGeminiTest] = useState<TestResult>(null);

  async function load() {
    const res = await fetch("/api/connector");
    const data: Status = await res.json();
    setStatus(data);
    setJiraBaseUrl(data.jira.baseUrl);
    setJiraEmail(data.jira.email);
    setGeminiModel(data.gemini.model || "gemini-3.5-flash-lite");
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

  async function disconnect(kind: "jira" | "gemini") {
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
    } else {
      setGeminiKey("");
      setGeminiTest(null);
    }
    await load();
  }

  async function test(target: "jira" | "gemini") {
    const setTesting = target === "jira" ? setTestingJira : setTestingGemini;
    const setResult = target === "jira" ? setJiraTest : setGeminiTest;
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
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        configured ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/40"
      }`}
    >
      {configured ? "Connected" : "Not connected"}
    </span>
  );

  const ResultBanner = ({ result }: { result: TestResult }) =>
    result && (
      <div
        className={`mt-2 rounded-md border px-3 py-2 text-xs ${
          result.ok
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
        }`}
      >
        {result.detail}
      </div>
    );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Connector</h1>
        <p className="text-sm text-white/50">
          Connect your own Jira site and Gemini API key. Credentials are stored locally by this
          app instance — nothing is sent anywhere except Jira and Google's Gemini API directly.
        </p>
      </div>

      <div className="space-y-6 p-4">
        {/* Jira */}
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium">Jira</div>
            {status && <Badge configured={status.jira.configured} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-white/50">Site URL</div>
              <input
                value={jiraBaseUrl}
                onChange={(e) => setJiraBaseUrl(e.target.value)}
                placeholder="https://your-domain.atlassian.net"
                className="w-full rounded-md border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-white/50">Account email</div>
              <input
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-white/50">
                API token{" "}
                {status?.jira.apiTokenMasked && (
                  <span className="text-white/30">(current: {status.jira.apiTokenMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={jiraToken}
                onChange={(e) => setJiraToken(e.target.value)}
                placeholder={status?.jira.apiTokenMasked ? "Leave blank to keep current token" : "Paste your Jira API token"}
                className="w-full rounded-md border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={saveJira}
              disabled={savingJira || !jiraBaseUrl || !jiraEmail}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingJira ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => test("jira")}
              disabled={testingJira || !status?.jira.configured}
              className="rounded-md border border-border px-4 py-1.5 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              {testingJira ? "Testing…" : "Test connection"}
            </button>
            {status?.jira.configured && (
              <button
                onClick={() => disconnect("jira")}
                className="rounded-md px-4 py-1.5 text-sm text-white/40 hover:text-red-300"
              >
                Disconnect
              </button>
            )}
          </div>
          <ResultBanner result={jiraTest} />
          <div className="mt-2 text-xs text-white/30">
            Create a token at Atlassian account → Security → API tokens.
          </div>
        </div>

        {/* Gemini */}
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium">Gemini</div>
            {status && <Badge configured={status.gemini.configured} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-white/50">
                API key{" "}
                {status?.gemini.apiKeyMasked && (
                  <span className="text-white/30">(current: {status.gemini.apiKeyMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={status?.gemini.apiKeyMasked ? "Leave blank to keep current key" : "Paste your Gemini API key"}
                className="w-full rounded-md border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-white/50">Model</div>
              <input
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                placeholder="gemini-3.5-flash-lite"
                className="w-full rounded-md border border-border bg-bg px-3 py-1.5 outline-none focus:border-accent"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={saveGemini}
              disabled={savingGemini}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingGemini ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => test("gemini")}
              disabled={testingGemini || !status?.gemini.configured}
              className="rounded-md border border-border px-4 py-1.5 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              {testingGemini ? "Testing…" : "Test connection"}
            </button>
            {status?.gemini.configured && (
              <button
                onClick={() => disconnect("gemini")}
                className="rounded-md px-4 py-1.5 text-sm text-white/40 hover:text-red-300"
              >
                Disconnect
              </button>
            )}
          </div>
          <ResultBanner result={geminiTest} />
          <div className="mt-2 text-xs text-white/30">Get a key from Google AI Studio.</div>
        </div>
      </div>
    </div>
  );
}
