import { loadConnectorConfig } from "./connectorStore";

/** Always reads fresh from the connector store (file-backed), so a key saved
 * through the Connector UI takes effect immediately without a server restart. */
export function getJiraConfig() {
  return loadConnectorConfig().jira;
}

export function getGeminiConfig() {
  return loadConnectorConfig().gemini;
}

export function isJiraConfigured(): boolean {
  const { baseUrl, email, apiToken } = getJiraConfig();
  return Boolean(baseUrl && email && apiToken);
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiConfig().apiKey);
}
