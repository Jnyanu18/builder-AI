// Server-only Groq AI provider. OpenAI-compatible API.
// Used for: drift analysis, repo scan reality model, chat assistant.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Default Groq model for production. Fast + strong reasoning. */
export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function createGroqProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

/** Throws if GROQ_API_KEY is missing. Returns a configured model handle. */
export function getGroqModel(model: string = GROQ_DEFAULT_MODEL) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY. Add it in project secrets.");
  return createGroqProvider(key)(model);
}
