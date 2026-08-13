import { prisma } from "../lib/prisma";
import { getGeminiClient } from "../lib/embeddings";
import { recallSimilarMemories } from "../recall";

// `gemini-3.6-flash` — current recommended default flash-tier model for
// general conversational text generation, confirmed directly against
// Google's docs during this pass (both the model-list page and the
// generateContent code example itself named it). Confidence: high on the
// model name/method shape, same as `gemini-embedding-2` in
// src/lib/embeddings.ts — but note Google's docs now lead with a newer
// "Interactions API" (ai.interactions.create) as of 2026-06, with
// generateContent described as "legacy" though still explicitly
// recommended for stable production use. Deliberately staying on
// generateContent here: it's what embeddings.ts already uses
// (ai.models.embedContent, the sibling method), and switching this
// project's Gemini usage to a second, newer API paradigm mid-hackathon
// isn't worth the added risk for what this task needs. Revisit if Google
// deprecates generateContent the way text-embedding-004 was deprecated.
const CHAT_MODEL = "gemini-3.6-flash";

// Design constraints from the project's production-readiness plan — not
// style preferences, deliberate safety/ethics decisions. Do not weaken.
const SYSTEM_INSTRUCTION = `You are a warm, patient conversational companion for an elderly person. Your job is to chat naturally and, when relevant, gently weave in things you remember about them from past conversations.

Rules you must always follow:
- Never correct, quiz, or contradict the person. If they repeat something they've already told you, or seem unsure or confused about something, gently steer the conversation forward rather than pointing out the repetition or correcting them.
- Never claim to be a real person, and never claim to be a specific named family member (their son, daughter, spouse, etc.) — you are a companion that helps them remember, not a stand-in for someone real in their life.
- When you have relevant remembered details, weave them naturally into the conversation — don't recite them as a list of facts.
- Only bring up a remembered detail if it's genuinely relevant to what the person just said. If nothing you remember is actually relevant, say so plainly and warmly rather than inventing or guessing details or forcing a connection.
- Keep your reply warm, brief, and conversational — this is a chat reply, not an essay.`;

interface GenerateCompanionReplyInput {
  elderId: string;
  message: string;
}

function formatMemoryContext(memories: { content: string; similarity: number }[]): string {
  if (memories.length === 0) {
    return "You don't have any remembered details relevant to this message.";
  }
  return (
    "Things you remember that might be relevant (only mention them if they genuinely fit the conversation):\n" +
    memories.map((m) => `- ${m.content} (similarity: ${m.similarity.toFixed(2)})`).join("\n")
  );
}

export async function generateCompanionReply({
  elderId,
  message,
}: GenerateCompanionReplyInput): Promise<string> {
  const recalled = await recallSimilarMemories({ elderId, queryText: message });

  const ai = getGeminiClient();
  const contents = `${formatMemoryContext(recalled)}\n\nThe person just said: "${message}"\n\nRespond as their companion.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
  } catch (err) {
    throw new Error(
      `Gemini reply generation failed (model: ${CHAT_MODEL}): ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  const replyText = response.text;
  if (!replyText) {
    throw new Error(`Gemini reply generation returned no text (model: ${CHAT_MODEL})`);
  }

  // Both turns logged together, after a reply is actually generated — if
  // Gemini fails, there's no completed exchange to record, so neither
  // turn gets written (all-or-nothing, matching addMemory's transactional
  // pattern in src/ingest/index.ts).
  await prisma.$transaction([
    prisma.conversationTurn.create({ data: { elderId, role: "elder", content: message } }),
    prisma.conversationTurn.create({ data: { elderId, role: "companion", content: replyText } }),
  ]);

  return replyText;
}
