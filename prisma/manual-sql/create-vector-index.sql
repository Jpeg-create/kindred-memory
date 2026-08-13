-- CONFIRMED WORKING AND ALREADY APPLIED to the production CockroachDB
-- Cloud cluster, via the CockroachDB Cloud web SQL Shell. This file is now
-- a reference/runbook, not a to-do — kept around in case the index ever
-- needs to be recreated (e.g. the Memory table gets dropped and recreated
-- during development, such as after a `prisma migrate reset`). Not a
-- Prisma migration, because this project uses `prisma db push`, not
-- migration history — see README-setup.md for why.

-- 1 & 2. Enabling the preview feature and disabling the write-safety guard.
--
--    Via the CockroachDB Cloud WEB SQL SHELL specifically, both of these
--    returned:
--        ERROR: disallowed statement type, SQLSTATE: XXUUU
--    That's the web console blocking certain admin-level SET statements
--    from that particular interface — not a real failure. The CREATE
--    VECTOR INDEX statement below succeeded immediately afterward anyway,
--    which means the underlying settings were already in the state this
--    needs (most likely default-enabled/allowed on this cluster's plan).
--    If you're running this via `cockroach sql` or `psql` instead of the
--    web Shell, these should execute normally — include them for
--    completeness/correctness on a cluster where they aren't already set.
SET CLUSTER SETTING feature.vector_index.enabled = true;
SET sql_safe_updates = false;

-- Before the real index, a throwaway test index was created and dropped
-- to empirically confirm cosine distance actually works on this specific
-- cluster — CockroachDB's own sources disagreed with each other on this:
-- the official Vector Indexes docs list `vector_cosine_ops` as valid,
-- while a CockroachDB engineering blog post described cosine support as
-- still "on the roadmap" as of that post. Rather than trust either source
-- blindly, this was tested directly:
--   CREATE VECTOR INDEX tmp_cosine_test ON "Memory" (embedding vector_cosine_ops);
--   DROP INDEX tmp_cosine_test;
-- It succeeded without error — cosine is confirmed functional on this
-- cluster. Worth remembering generally: docs and blog posts can be stale
-- relative to what's actually shipped; a direct empirical test against
-- the live cluster settled it here.

-- 3. The real index — ran exactly as written below, no syntax changes
--    needed from the original draft of this file. `elderId` as a prefix
--    column scopes cosine-distance search per elder, matching
--    src/recall/index.ts's query shape (WHERE "elderId" = ... ORDER BY
--    embedding <=> ... LIMIT ...).
CREATE VECTOR INDEX memory_embedding_cosine_idx
  ON "Memory" ("elderId", embedding vector_cosine_ops);

-- Confirmed via `SHOW INDEXES FROM "Memory";`: the index has elderId at
-- seq_in_index 1 (prefix column), embedding at seq_in_index 2, and id at
-- seq_in_index 3 (CockroachDB implicitly includes the primary key).

-- 4. Not strictly required, but good hygiene — don't leave the session's
--    safety guard off longer than needed.
SET sql_safe_updates = true;

-- ---------------------------------------------------------------------
-- KNOWN: the query planner won't pick this index yet at current (tiny,
-- test-scale) data volume — see the note on Memory.embedding in
-- prisma/schema.prisma for why that's expected, correct, cost-based
-- optimizer behavior, not a bug in this index.
--
-- Re-running this file: these are the same statements that worked, so
-- they're safe to reuse if this index needs to be recreated from scratch.
-- Whether `CREATE VECTOR INDEX` supports `IF NOT EXISTS` was not tested —
-- if the index might already exist, check first with
-- `SHOW INDEXES FROM "Memory";`, and `DROP INDEX memory_embedding_cosine_idx;`
-- before recreating if it does.
