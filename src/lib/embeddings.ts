import { GoogleGenAI } from "@google/genai";

// `text-embedding-004` (the model named in earlier task instructions) was
// shut down by Google on 2026-01-14 — confirmed against the Gemini API
// changelog during this pass. `gemini-embedding-2` is the current GA
// replacement (released 2026-04-22) and, per Google's docs, supports
// truncating its native output down to 768 dimensions via
// `outputDimensionality`, with auto-normalization applied to the truncated
// vector. Using that here to match the existing `vector(768)` column
// instead of silently reaching for a same-named-but-different model.
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;

let client: GoogleGenAI | undefined;

// Exported so other Gemini callers (e.g. src/companion/reply.ts, for text
// generation) share this same client/API-key setup instead of duplicating
// it — same GEMINI_API_KEY, same lazy singleton.
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();

  let response;
  try {
    response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });
  } catch (err) {
    throw new Error(
      `Gemini embedding request failed (model: ${EMBEDDING_MODEL}): ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Gemini embedding response was missing values or had unexpected dimensionality ` +
        `(expected ${EMBEDDING_DIMENSIONS}, model: ${EMBEDDING_MODEL})`,
    );
  }

  return values;
}
