import { loadConnectorConfig } from "./connectorStore";

/** Always reads fresh from the connector store (KV in production, file-backed
 * locally), so a key saved through the Connector UI takes effect immediately
 * without a server restart. */
export async function getJiraConfig() {
  return (await loadConnectorConfig()).jira;
}

export async function getGeminiConfig() {
  return (await loadConnectorConfig()).gemini;
}

export async function isJiraConfigured(): Promise<boolean> {
  const { baseUrl, email, apiToken } = await getJiraConfig();
  return Boolean(baseUrl && email && apiToken);
}

export async function isGeminiConfigured(): Promise<boolean> {
  return Boolean((await getGeminiConfig()).apiKey);
}
