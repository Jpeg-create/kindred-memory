# KindredMemory

A conversational companion for people living with memory loss — and a
quiet window into those conversations for the family who loves them.

The family adds the things that matter (names, relationships, what's
coming up this week) once, in plain sentences, on a dashboard. The person
just talks, on a simple chat page. The companion recalls what was added —
not by keyword matching, but through a real vector search over everything
on file — and weaves it naturally into the conversation, without quizzing
or correcting.

**Live demo:** https://kindred-memory.vercel.app/

## How it works

1. **Add a memory** — a family member types a sentence on the dashboard
   (`/dashboard`). It's embedded with Gemini (`gemini-embedding-2`, 768
   dimensions) and stored in CockroachDB Cloud alongside its vector.
2. **Talk** — the person opens `/chat` and sends a message. The message is
   embedded the same way, and CockroachDB's vector search finds the
   memories most similar to it (cosine similarity, backed by a real vector
   index, `memory_embedding_cosine_idx`).
3. **Reply** — the recalled memories are handed to Gemini
   (`gemini-3.6-flash`) along with a system prompt that keeps the
   companion warm, honest about what it doesn't know, and careful never to
   correct or quiz the person or impersonate a real family member. The
   reply is generated and the full turn (both sides) is logged.
4. **Close the loop** — back on the dashboard, "Lately" shows that a
   conversation happened and lets the family read the transcript — not to
   monitor, just to know she's talking to someone.

## Stack

- **Frontend** — Vite + React (`frontend/`), deployed on Vercel.
- **Database** — [CockroachDB Cloud](https://www.cockroachlabs.com/), via
  Prisma ORM, using a native `vector(768)` column and cosine-similarity
  vector index for recall.
- **Embeddings & chat** — Google Gemini (`gemini-embedding-2` for
  embeddings, `gemini-3.6-flash` for companion replies).
- **Backend** — AWS Lambda functions behind an API Gateway HTTP API (see
  `template.yaml`), handling memory ingest, recall, chat, and the
  dashboard's list/transcript endpoints.

## Repo layout

```
src/
  ingest/       write a new memory + its embedding
  recall/       vector search for memories relevant to a message
  companion/    builds the Gemini chat reply from recalled memories
  lambda/       one handler per API route, deployed via template.yaml
  lib/          Prisma client, Gemini client, conversation-session helpers
frontend/       the Vite + React app (Landing, Dashboard, Chat)
prisma/         schema.prisma + the manual vector-index SQL
template.yaml   AWS SAM template for the Lambda + API Gateway backend
```

## Running it yourself

This needs a real CockroachDB Cloud cluster and a real Gemini API key —
see [`README-setup.md`](./README-setup.md) for the exact steps, including
two CockroachDB-specific gotchas (schema drift detection and
`schema_locked` tables) that cost real time to work out the first time.

## License

MIT — see [`LICENSE`](./LICENSE).
