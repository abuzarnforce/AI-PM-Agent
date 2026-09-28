import { getSlackConfig, isSlackConfigured } from "./config";

export interface SlackAuthTestResult {
  ok: boolean;
  url?: string;
  team?: string;
  user?: string;
  team_id?: string;
  user_id?: string;
  bot_id?: string;
  error?: string;
}

export async function testSlackAccess(tokenOverride?: string): Promise<SlackAuthTestResult> {
  const token = tokenOverride ?? (await getSlackConfig()).botToken;
  if (!token) {
    throw new Error("Slack Bot Token is not configured.");
  }
  const res = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Failed to authenticate with Slack.");
  }
  return data;
}

export async function postSlackMessage(channel: string, text: string): Promise<boolean> {
  if (!(await isSlackConfigured())) {
    throw new Error("Slack is not configured.");
  }
  const { botToken } = await getSlackConfig();
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Failed to post message to Slack.");
  }
  return true;
}
