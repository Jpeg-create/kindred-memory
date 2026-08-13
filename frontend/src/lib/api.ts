const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://u2ygtaavmh.execute-api.eu-central-1.amazonaws.com';

// Hardcoded for the hackathon demo — single test elder, no multi-elder picker.
export const ELDER_ID = '0435c7f7-78fb-4c8e-b461-91d022bb41cb';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const data = await request<{ familyMembers: FamilyMember[] }>(
    `/family-members?elderId=${ELDER_ID}`,
  );
  return data.familyMembers;
}

export interface Memory {
  id: string;
  content: string;
  source: string;
  addedByFamilyMember: { id: string; name: string } | null;
  createdAt: string;
}

export async function getMemories(): Promise<Memory[]> {
  const data = await request<{ memories: Memory[] }>(
    `/memories?elderId=${ELDER_ID}`,
  );
  return data.memories;
}

export async function addMemory(params: {
  content: string;
  source: string;
  addedByFamilyMemberId?: string;
}): Promise<void> {
  await request('/memory', {
    method: 'POST',
    body: JSON.stringify({ elderId: ELDER_ID, ...params }),
  });
}

export async function sendChatMessage(message: string): Promise<string> {
  const data = await request<{ reply: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ elderId: ELDER_ID, message }),
  });
  return data.reply;
}

export interface ConversationSession {
  startTime: string;
  endTime: string;
  turnCount: number;
  preview: string;
}

export async function getConversations(): Promise<ConversationSession[]> {
  const data = await request<{ sessions: ConversationSession[] }>(
    `/conversations?elderId=${ELDER_ID}`,
  );
  return data.sessions;
}

export interface TranscriptTurn {
  role: string;
  content: string;
  createdAt: string;
}

export async function getTranscript(
  start: string,
  end: string,
): Promise<TranscriptTurn[]> {
  const data = await request<{ turns: TranscriptTurn[] }>(
    `/conversations/transcript?elderId=${ELDER_ID}&start=${encodeURIComponent(
      start,
    )}&end=${encodeURIComponent(end)}`,
  );
  return data.turns;
}
