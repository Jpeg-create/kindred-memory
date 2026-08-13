import type { ConversationTurn } from "@prisma/client";

// A new session starts whenever the gap since the previous turn exceeds
// this threshold. 2 hours is a reasonable default for "this was a
// distinct conversation, not a continuation" — tune here if the family
// dashboard's feed feels too chunky or too fragmented in practice.
export const SESSION_GAP_THRESHOLD_MS = 2 * 60 * 60 * 1000;

// Plain truncation of the first elder message, no summarization — keeps
// the feed preview cheap and predictable.
const PREVIEW_MAX_LENGTH = 80;

export interface ConversationSessionSummary {
  startTime: Date;
  endTime: Date;
  turnCount: number;
  preview: string;
}

type SessionTurn = Pick<ConversationTurn, "role" | "content" | "createdAt">;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

// `turns` must already be ordered ascending by createdAt, for one elder.
export function groupIntoSessions(turns: SessionTurn[]): ConversationSessionSummary[] {
  const sessionGroups: SessionTurn[][] = [];

  for (const turn of turns) {
    const currentGroup = sessionGroups[sessionGroups.length - 1];
    const previousTurn = currentGroup?.[currentGroup.length - 1];
    const gapMs = previousTurn ? turn.createdAt.getTime() - previousTurn.createdAt.getTime() : Infinity;

    if (!currentGroup || gapMs > SESSION_GAP_THRESHOLD_MS) {
      sessionGroups.push([turn]);
    } else {
      currentGroup.push(turn);
    }
  }

  return sessionGroups.map((group) => {
    // Prefer the first elder message as the preview — it's what prompted
    // the conversation. Fall back to the first turn if a session somehow
    // has no elder turn at all.
    const firstElderTurn = group.find((turn) => turn.role === "elder");
    const previewSource = (firstElderTurn ?? group[0]).content;

    return {
      startTime: group[0].createdAt,
      endTime: group[group.length - 1].createdAt,
      turnCount: group.length,
      preview: truncate(previewSource, PREVIEW_MAX_LENGTH),
    };
  });
}
