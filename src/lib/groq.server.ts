// Server-only Groq AI provider. OpenAI-compatible API.
// Used for: drift analysis, repo scan reality model, chat assistant.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Default Groq model for production. Free-tier Groq model. */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

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
