import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiConfig, isGeminiConfigured } from "./config";

const RETRY_DELAYS_MS = [500, 1500, 4000];

function isDailyQuotaExhausted(message: string): boolean {
  return /PerDay/i.test(message) && /quota/i.test(message);
}

function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = String((err as Error)?.message ?? "");
  if (isDailyQuotaExhausted(message)) return false;
  return status === 503 || status === 429 || /503|429|overloaded|high demand/i.test(message);
}

async function generateTextNvidia(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const chosenModel = !model || model.startsWith("gemini") ? "meta/llama-3.2-11b-vision-instruct" : model;
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chosenModel,
          messages,
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const detail = errJson.detail || errJson.title || errJson.error?.message || res.statusText;
        throw new Error(`[NVIDIA NIM Error]: ${res.status} ${detail}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      lastError = err;
      if (attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  if (!(await isGeminiConfigured())) {
    throw new Error("AI engine is not configured. Connect it from the Connector tab.");
  }
  const { apiKey, model } = await getGeminiConfig();

  if (apiKey.startsWith("nvapi-")) {
    return generateTextNvidia(apiKey, model, prompt, systemInstruction);
  }

  const client = new GoogleGenerativeAI(apiKey);
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
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
