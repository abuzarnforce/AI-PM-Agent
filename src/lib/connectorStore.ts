import fs from "node:fs";
import path from "node:path";

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
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "connectors.json");

const EMPTY: ConnectorConfig = {
  jira: { baseUrl: "", email: "", apiToken: "" },
  gemini: { apiKey: "", model: "gemini-3.6-flash" },
};

/** Env vars act only as an initial seed for first run (handy for the maintainer's own
 * deployment). Once a value is saved through the Connector UI, the stored file wins —
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
      model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    },
  };
}

export function loadConnectorConfig(): ConnectorConfig {
  if (!fs.existsSync(STORE_FILE)) return envSeed();
  try {
    const stored = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) as ConnectorConfig;
    const seed = envSeed();
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
    };
  } catch {
    return envSeed();
  }
}

export function saveConnectorConfig(partial: {
  jira?: Partial<ConnectorConfig["jira"]>;
  gemini?: Partial<ConnectorConfig["gemini"]>;
}): ConnectorConfig {
  const current = loadConnectorConfig();
  const next: ConnectorConfig = {
    jira: { ...current.jira, ...partial.jira },
    gemini: { ...current.gemini, ...partial.gemini },
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function clearConnector(kind: "jira" | "gemini"): ConnectorConfig {
  const current = loadConnectorConfig();
  const next: ConnectorConfig = {
    ...current,
    [kind]: EMPTY[kind],
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

function mask(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}

/** Safe-to-send-to-the-browser view: never echoes full secrets back. */
export function connectorStatus() {
  const cfg = loadConnectorConfig();
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
  };
}
