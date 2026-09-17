import { GoogleGenerativeAI } from "@google/generative-ai";
import { config, isGeminiConfigured } from "./config";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini is not configured. Set GEMINI_API_KEY in .env.local.");
  }
  if (!client) client = new GoogleGenerativeAI(config.gemini.apiKey);
  return client;
}

export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: config.gemini.model,
    systemInstruction,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
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
