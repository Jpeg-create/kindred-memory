import { prisma } from "../lib/prisma";
import { getEmbedding } from "../lib/embeddings";

interface RecallSimilarMemoriesInput {
  elderId: string;
  queryText: string;
  limit?: number;
}

interface RecalledMemory {
  id: string;
  content: string;
  createdAt: Date;
  similarity: number;
}

// CockroachDB's vector distance operators (confirmed against current docs
// during this pass): `<->` for L2/Euclidean distance, `<=>` for cosine
// distance — same operators pgvector uses. `similarity` here is
// `1 - cosine_distance` (the standard cosine-similarity identity), so
// higher = more similar, computed in SQL rather than in JS.
//
// No vector index exists yet — it's prepared but not yet run, see
// prisma/manual-sql/create-vector-index.sql and the TODO on
// Memory.embedding in prisma/schema.prisma — so this currently runs as a
// brute-force sequential scan ordered by distance. That's fine for a
// small number of memories per elder.
//
// This query's shape does NOT need to change once the index exists.
// CockroachDB's vector indexes support a "prefix column" (here, elderId)
// for scoped/filtered search, and per their docs, the index is used when
// each prefix column is constrained with equality in the query — which
// `WHERE "elderId" = ...` already does, combined with the required
// `ORDER BY <distance operator>` and `LIMIT`. The index script creates
// the index with elderId as that prefix column specifically to match this
// existing query, rather than this query being reshaped to match the
// index.
export async function recallSimilarMemories({
  elderId,
  queryText,
  limit = 5,
}: RecallSimilarMemoriesInput): Promise<RecalledMemory[]> {
  const queryEmbedding = await getEmbedding(queryText);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRaw<RecalledMemory[]>`
    SELECT id, content, "createdAt",
           1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "Memory"
    WHERE "elderId" = ${elderId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector ASC
    LIMIT ${limit}
  `;

  await prisma.auditLogEntry.create({
    data: {
      actorType: "system",
      action: "memory_recalled",
      // Not a single Memory id (this action reads across many) — recording
      // which elder's memories were searched instead.
      targetId: elderId,
    },
  });

  return results;
}
