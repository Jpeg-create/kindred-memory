// Scratch script — NOT part of src/'s real logic, just a manual smoke test.
// Costs real Gemini API credits and writes real rows to the CockroachDB
// cluster in DATABASE_URL. Do not run without explicit confirmation.
//
//   npx tsx src/test-memory-flow.ts
//
// (not `ts-node` — TypeScript 7 removed the old compiler API ts-node
// depends on, which crashes it on this project; tsx works instead.)

import { prisma } from "./lib/prisma";
import { addMemory } from "./ingest";
import { recallSimilarMemories } from "./recall";

const TEST_WHATSAPP_NUMBER = "+10000000000";

async function main() {
  const elder = await prisma.elder.upsert({
    where: { whatsappNumber: TEST_WHATSAPP_NUMBER },
    update: {},
    create: { name: "Test Elder", whatsappNumber: TEST_WHATSAPP_NUMBER },
  });
  console.log(`Using test elder: ${elder.id}`);

  const sampleMemories = [
    "Her husband's name is Kunle, they got married in 1972.",
    "She grew up on a small farm outside Ibadan and has three siblings.",
    "Her favorite meal is jollof rice with fried plantain.",
  ];

  for (const content of sampleMemories) {
    const memory = await addMemory({
      elderId: elder.id,
      content,
      source: "family_added",
    });
    console.log(`Added memory ${memory.id}: "${content}"`);
  }

  const queryText = "who is her husband";
  const results = await recallSimilarMemories({ elderId: elder.id, queryText });

  console.log(`\nRecall results for "${queryText}":`);
  for (const r of results) {
    console.log(`  [similarity=${r.similarity.toFixed(4)}] ${r.content}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
