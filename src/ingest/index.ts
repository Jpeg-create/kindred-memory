import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { getEmbedding } from "../lib/embeddings";
import type { MemorySource } from "@prisma/client";

interface AddMemoryInput {
  elderId: string;
  content: string;
  source: MemorySource;
  addedByFamilyMemberId?: string;
}

interface AddedMemory {
  id: string;
  createdAt: Date;
}

// Prisma Client has no typed API for the `embedding Unsupported("vector(768)")`
// column (see prisma/schema.prisma) — its query builder skips Unsupported
// fields entirely, so the insert below goes through `$queryRaw` with a
// parameterized `::vector` cast, per Prisma's own documented pattern for
// pgvector-shaped columns. The `${...}` placeholders are still bound
// parameters (Prisma's tagged-template raw queries), not string
// concatenation, so this isn't a SQL-injection risk.
export async function addMemory({
  elderId,
  content,
  source,
  addedByFamilyMemberId,
}: AddMemoryInput): Promise<AddedMemory> {
  const embedding = await getEmbedding(content);
  const vectorLiteral = `[${embedding.join(",")}]`;
  const id = randomUUID();
  const actorType = addedByFamilyMemberId ? "family" : "system";

  // Interactive transaction: the raw vector insert and the Prisma-client
  // AuditLogEntry write share one CockroachDB transaction. Confirmed
  // working end to end against the real cluster and the real Gemini API
  // (see src/test-memory-flow.ts) — no adapter/driver friction.
  const memory = await prisma.$transaction(async (tx) => {
    const [inserted] = await tx.$queryRaw<AddedMemory[]>`
      INSERT INTO "Memory" (id, "elderId", content, source, "addedByFamilyMemberId", embedding)
      VALUES (
        ${id},
        ${elderId},
        ${content},
        ${source}::"MemorySource",
        ${addedByFamilyMemberId ?? null},
        ${vectorLiteral}::vector
      )
      RETURNING id, "createdAt"
    `;

    await tx.auditLogEntry.create({
      data: {
        actorType,
        actorId: addedByFamilyMemberId ?? null,
        action: "memory_added",
        targetId: inserted.id,
      },
    });

    return inserted;
  });

  return memory;
}
