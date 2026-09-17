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

export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const { client, model } = getClient();
  const generativeModel = client.getGenerativeModel({ model, systemInstruction });
  const result = await generativeModel.generateContent(prompt);
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
