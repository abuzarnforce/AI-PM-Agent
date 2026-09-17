import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiConfig, isGeminiConfigured } from "./config";

/** No cached singleton: the API key can change at any time via the Connector UI,
 * so a fresh client is built from the current stored config on every call. */
function getClient(): { client: GoogleGenerativeAI; model: string } {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini is not configured. Connect it from the Connector tab.");
  }
  const { apiKey, model } = getGeminiConfig();
  return { client: new GoogleGenerativeAI(apiKey), model };
}

/** A hard per-day (or otherwise non-recoverable-soon) quota cap — retrying within
 * the same request just burns time, since Google won't lift it for hours. */
function isDailyQuotaExhausted(message: string): boolean {
  return /PerDay/i.test(message) && /quota/i.test(message);
}

/** A genuine transient blip (server overload, short per-minute burst) worth retrying. */
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = String((err as Error)?.message ?? "");
  if (isDailyQuotaExhausted(message)) return false;
  return status === 503 || status === 429 || /503|429|overloaded|high demand/i.test(message);
}

const RETRY_DELAYS_MS = [500, 1500, 4000];

/** Gemini's free tier returns transient 503 ("high demand") / short-burst 429 errors
 * fairly often. Retry a few times with backoff before giving up, so a brief spike on
 * Google's side doesn't surface as a broken feature — but never retry a per-day quota
 * exhaustion, since that won't clear until Google resets it. */
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const { client, model } = getClient();
  const generativeModel = client.getGenerativeModel({ model, systemInstruction });

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await generativeModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  const message = String((lastError as Error)?.message ?? "");
  if (isDailyQuotaExhausted(message)) {
    const modelMatch = message.match(/model:\s*([\w.-]+)/i)?.[1] ?? model;
    const limitMatch = message.match(/"quotaValue":"(\d+)"/)?.[1];
    throw new Error(
      `Gemini's free-tier daily limit${limitMatch ? ` (${limitMatch} requests)` : ""} for ` +
        `"${modelMatch}" is used up for today. It resets in ~24h, or switch to a different ` +
        `model in the Connector tab (each model has its own daily quota), or enable billing ` +
        `on your Google AI Studio project for higher limits.`
    );
  }
  throw lastError;
}

/** Asks Gemini to produce strict JSON matching the given shape description.
 * Retries once with a correction prompt if the first response isn't valid JSON. */
export async function generateJson<T>(prompt: string, systemInstruction?: string): Promise<T> {
  const raw = await generateText(
    `${prompt}\n\nRespond with ONLY valid JSON, no markdown fences, no commentary.`,
    systemInstruction
  );
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    const retry = await generateText(
      `Your previous response was not valid JSON. Here it was:\n${raw}\n\nReturn ONLY valid JSON for this request:\n${prompt}`,
      systemInstruction
    );
    return JSON.parse(stripFences(retry)) as T;
  }
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
}
