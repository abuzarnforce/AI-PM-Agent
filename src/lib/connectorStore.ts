import { readJson, writeJson } from "./kvStore";

export interface ConnectorConfig {
  jira: {
    baseUrl: string;
    email: string;
    apiToken: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  github: {
    repo: string; // "owner/name"
    token: string;
  };
}

const STORE_KEY = "connectors";

const EMPTY: ConnectorConfig = {
  jira: { baseUrl: "", email: "", apiToken: "" },
  gemini: { apiKey: "", model: "gemini-3.5-flash-lite" },
  github: { repo: "", token: "" },
};

/** Env vars act only as an initial seed for first run (handy for the maintainer's own
 * deployment). Once a value is saved through the Connector UI, the stored value wins —
 * that's what makes this a piece of software anyone can download and configure
 * themselves without touching environment variables or redeploying. */
function envSeed(): ConnectorConfig {
  return {
    jira: {
      baseUrl: process.env.JIRA_BASE_URL ?? "",
      email: process.env.JIRA_EMAIL ?? "",
      apiToken: process.env.JIRA_API_TOKEN ?? "",
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    },
    github: {
      repo: process.env.GITHUB_REPO ?? "",
      token: process.env.GITHUB_TOKEN ?? "",
    },
  };
}

export async function loadConnectorConfig(): Promise<ConnectorConfig> {
  const stored = await readJson<ConnectorConfig>(STORE_KEY);
  const seed = envSeed();
  if (!stored) return seed;
  return {
    jira: {
      baseUrl: stored.jira?.baseUrl || seed.jira.baseUrl,
      email: stored.jira?.email || seed.jira.email,
      apiToken: stored.jira?.apiToken || seed.jira.apiToken,
    },
    gemini: {
      apiKey: stored.gemini?.apiKey || seed.gemini.apiKey,
      model: stored.gemini?.model || seed.gemini.model,
    },
    github: {
      repo: stored.github?.repo || seed.github.repo,
      token: stored.github?.token || seed.github.token,
    },
  };
}

export async function saveConnectorConfig(partial: {
  jira?: Partial<ConnectorConfig["jira"]>;
  gemini?: Partial<ConnectorConfig["gemini"]>;
  github?: Partial<ConnectorConfig["github"]>;
}): Promise<ConnectorConfig> {
  const current = await loadConnectorConfig();
  const next: ConnectorConfig = {
    jira: { ...current.jira, ...partial.jira },
    gemini: { ...current.gemini, ...partial.gemini },
    github: { ...current.github, ...partial.github },
  };
  await writeJson(STORE_KEY, next);
  return next;
}

export async function clearConnector(kind: "jira" | "gemini" | "github"): Promise<ConnectorConfig> {
  const current = await loadConnectorConfig();
  const next: ConnectorConfig = {
    ...current,
    [kind]: EMPTY[kind],
  };
  await writeJson(STORE_KEY, next);
  return next;
}

function mask(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}

/** Safe-to-send-to-the-browser view: never echoes full secrets back. */
export async function connectorStatus() {
  const cfg = await loadConnectorConfig();
  return {
    jira: {
      baseUrl: cfg.jira.baseUrl,
      email: cfg.jira.email,
      apiTokenMasked: mask(cfg.jira.apiToken),
      configured: Boolean(cfg.jira.baseUrl && cfg.jira.email && cfg.jira.apiToken),
    },
    gemini: {
      model: cfg.gemini.model,
      apiKeyMasked: mask(cfg.gemini.apiKey),
      configured: Boolean(cfg.gemini.apiKey),
    },
    github: {
      repo: cfg.github.repo,
      tokenMasked: mask(cfg.github.token),
      configured: Boolean(cfg.github.repo && cfg.github.token),
    },
  };
}
