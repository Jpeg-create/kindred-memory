# Setup — connecting to your real CockroachDB Cloud cluster

These are the steps to point a fresh clone of this repo at a real
CockroachDB Cloud cluster and the real Gemini API, written from what
actually worked (and didn't) when this was set up the first time,
including two CockroachDB-specific gotchas below. Run these yourself —
nothing here runs automatically.

## 1. Create your local `.env`

```bash
cp .env.example .env
```

Then edit `.env` and paste in real values for both:

- `DATABASE_URL` — from the CockroachDB Cloud console: your cluster →
  **Connect** → **Connection string** tab. It should look like the
  placeholder shape in `.env.example`, just with real
  host/user/password/database values.
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey. Used by
  `src/lib/embeddings.ts` to call Gemini's `gemini-embedding-2` model.

`.env` is already gitignored (with an explicit `!.env.example` exception),
so it will not be committed.

## 2. Generate the Prisma Client

```bash
npx prisma generate
```

This reads `prisma/schema.prisma` and `prisma.config.ts` and writes the
generated client into `node_modules/@prisma/client`. It does not touch the
database.

## 3. Push the schema to your cluster

```bash
npx prisma db push
```

This will connect to the real cluster in your `.env` and create the
tables for `FamilyMember`, `Elder`, `Memory`, `ConversationTurn`, and
`AuditLogEntry`. This is the step that actually touches your live
database — make sure `DATABASE_URL` in `.env` is correct before running
it.

**Use `db push`, not `prisma migrate dev`.** We tried `migrate dev` first
and it doesn't work on CockroachDB Cloud here: CockroachDB Cloud
auto-creates a `crdb_internal_region` enum on the database, and Prisma's
migration drift-detection sees that enum (which isn't in `schema.prisma`)
and refuses to proceed. `db push` skips drift detection/migration history
entirely and just reconciles the live schema to match `schema.prisma`,
which sidesteps the problem. The tradeoff — no migration history — is
fine for a hackathon project; revisit if this ever needs real migrations.

**If a table is `schema_locked`:** CockroachDB creates new tables with
`schema_locked = true` by default (a safety setting that blocks further
schema changes). The first `db push` (creating tables from nothing) isn't
affected, but if you change `schema.prisma` later and `db push` again,
you'll hit `schema_locked` errors on tables that already exist. Fix by
unlocking each table first, then re-running `db push`:

```sql
ALTER TABLE "FamilyMember" SET (schema_locked = false);
ALTER TABLE "Elder" SET (schema_locked = false);
ALTER TABLE "Memory" SET (schema_locked = false);
ALTER TABLE "ConversationTurn" SET (schema_locked = false);
ALTER TABLE "AuditLogEntry" SET (schema_locked = false);
```

Run that via the CockroachDB Cloud console's SQL shell (or `psql`/`cockroach sql`
against your cluster) — Prisma's raw-query methods aren't a great fit for
one-off admin SQL like this.

## 4. Ingest and recall are built — the vector index is the remaining TODO

`Memory.embedding` is `Unsupported("vector(768)")` (768 dims — matches
Gemini's `gemini-embedding-2` model at `outputDimensionality: 768`).
Ingest (`src/ingest/index.ts`) and recall (`src/recall/index.ts`) both
read/write it via raw SQL and are confirmed working end to end against a
real cluster and the real Gemini API — see `src/test-memory-flow.ts`.
Prisma Client itself still won't expose `embedding` as a typed/queryable
field (no `prisma.memory.findMany({ where: { embedding: ... } })`) — that's
permanent, not a gap to close, since Prisma has no native vector type.

What's still actually outstanding is the CockroachDB vector **index**
(HNSW-style, currently in preview) — there is none yet, so recall runs as
a brute-force sequential scan ordered by distance, which is fine at
current data volume. To add the index later:

1. Enable the preview feature on your cluster first (one-time):
   ```sql
   SET CLUSTER SETTING feature.vector_index.enabled = true;
   ```
2. Add the index via raw DDL run directly against the cluster (SQL shell,
   same as the `schema_locked` step above) — not via
   `prisma migrate dev --create-only`, since this project doesn't use
   Prisma's migration history (see the `db push` note above), so there's
   no migration file for Prisma to generate or hand-edit here.

## Sanity check

Once steps 1–3 are done, run `npx tsx src/test-memory-flow.ts` (see the
comment at the top of that file — costs real Gemini API credits and
writes real rows, so only run it intentionally) to confirm ingest and
recall both work against your cluster.
