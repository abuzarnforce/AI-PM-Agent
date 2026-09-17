export const config = {
  jira: {
    baseUrl: process.env.JIRA_BASE_URL ?? "",
    email: process.env.JIRA_EMAIL ?? "",
    apiToken: process.env.JIRA_API_TOKEN ?? "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro",
  },
};

export function isJiraConfigured(): boolean {
  return Boolean(config.jira.baseUrl && config.jira.email && config.jira.apiToken);
}

export function isGeminiConfigured(): boolean {
  return Boolean(config.gemini.apiKey);
}
