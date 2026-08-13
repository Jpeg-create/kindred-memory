// Builds the two Lambda deployment packages into dist-lambda/<function>/.
//
// Why not SAM's built-in `Metadata.BuildMethod: esbuild`? That path bundles
// your handler code fine, but this project's real dependency risk is
// @prisma/client: Prisma 7's query compiler (no more Rust binary — see
// prisma/schema.prisma's header comment) ships as a handful of
// provider-specific `query_compiler_*_bg.<provider>.*.js` files that
// Prisma's runtime selects with a computed require/import at runtime, not
// a static one esbuild can see. Bundling that code risks silently dropping
// files esbuild's static analysis can't trace. Sidestepping that
// entirely: esbuild only bundles first-party src/ code here (via
// `packages: "external"`), and node_modules is resolved normally by Node
// at runtime, exactly as it is locally.
//
// Naively copying the repo's whole top-level node_modules alongside each
// bundled handler was tried first and produced a 427MB package per
// function — Lambda's hard limit is 250MB unzipped. The bloat wasn't the
// real runtime deps; it was `prisma` (the CLI), which this project's
// package.json lists as a regular dependency and which drags in Prisma
// Studio's UI toolchain (React, protobufjs, elkjs, etc.) — none of that
// runs in the Lambda handler. So instead: resolve and install the actual
// runtime dependency closure into an isolated temp directory via
// `npm install`, then overlay the real *generated* @prisma/client + .prisma
// directories from this repo's node_modules on top (the CLI itself is
// never copied — its job, generating the client, already happened when
// you ran `npx prisma generate`).
//
// That second part shipped a real production bug: `@prisma/client` itself
// was left OUT of the npm-installed set (only @prisma/adapter-pg, pg,
// @google/genai, dotenv were installed) and just `cpSync`'d in from the
// generated output afterward. Since npm never saw @prisma/client as
// something to resolve, it never installed what @prisma/client's own
// package.json depends on — including @prisma/client-runtime-utils, which
// Prisma's client runtime requires via a dynamic/computed require, not a
// static import. Lambda failed on cold start:
// `Cannot find module '@prisma/client-runtime-utils'`. This is exactly
// the failure mode of predicting a dependency graph by hand instead of
// asking npm to resolve it — so @prisma/client is now included in the
// npm-installed set below (letting npm's resolver find its full real
// transitive closure), and only the generated *contents* of
// @prisma/client + .prisma get overlaid afterward, not the decision of
// whether @prisma/client's dependencies get installed at all.

import { build } from "esbuild";
import { existsSync, rmSync, mkdirSync, cpSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outRoot = path.join(rootDir, "dist-lambda");
const nodeModules = path.join(rootDir, "node_modules");

const functions = [
  { name: "addMemoryHandler", entry: "src/lambda/addMemoryHandler.ts" },
  { name: "recallHandler", entry: "src/lambda/recallHandler.ts" },
];

// Direct runtime packages actually imported by the Lambda handlers'
// dependency chain (checked against src/lib/prisma.ts and
// src/lib/embeddings.ts). `prisma` (the CLI) and Prisma's own
// TypeScript/Node types are intentionally excluded — dev/build-time only.
// @prisma/client IS included here (unlike the previous version of this
// script) specifically so npm resolves ITS real dependency closure too —
// see the header comment above for why that matters.
const runtimeDeps = ["@prisma/client", "@prisma/adapter-pg", "pg", "@google/genai", "dotenv"];

if (!existsSync(path.join(nodeModules, "@prisma", "client"))) {
  console.error("node_modules/@prisma/client not found — run `npx prisma generate` first.");
  process.exit(1);
}

function pinnedVersion(pkg) {
  const pkgJsonPath = path.join(nodeModules, ...pkg.split("/"), "package.json");
  return JSON.parse(readFileSync(pkgJsonPath, "utf-8")).version;
}

console.log("Resolving runtime dependency closure into an isolated temp install...");
const depsDir = path.join(tmpdir(), "kindred-memory-lambda-deps");
rmSync(depsDir, { recursive: true, force: true });
mkdirSync(depsDir, { recursive: true });
writeFileSync(
  path.join(depsDir, "package.json"),
  JSON.stringify({ name: "lambda-deps", private: true }, null, 2),
);

const pinnedSpecs = runtimeDeps.map((dep) => `${dep}@${pinnedVersion(dep)}`);
execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", ...pinnedSpecs], {
  cwd: depsDir,
  stdio: "inherit",
});

rmSync(outRoot, { recursive: true, force: true });

for (const fn of functions) {
  const outDir = path.join(outRoot, fn.name);
  mkdirSync(outDir, { recursive: true });

  await build({
    entryPoints: [path.join(rootDir, fn.entry)],
    outfile: path.join(outDir, "index.js"),
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    packages: "external", // don't bundle node_modules — see header comment
    sourcemap: true,
    logLevel: "info",
  });

  cpSync(path.join(depsDir, "node_modules"), path.join(outDir, "node_modules"), {
    recursive: true,
    dereference: true,
  });
  // Overlay the real, schema-generated client (not a fresh/ungenerated one).
  cpSync(
    path.join(nodeModules, "@prisma", "client"),
    path.join(outDir, "node_modules", "@prisma", "client"),
    { recursive: true, dereference: true },
  );
  cpSync(path.join(nodeModules, ".prisma"), path.join(outDir, "node_modules", ".prisma"), {
    recursive: true,
    dereference: true,
  });

  console.log(`Built ${fn.name} -> ${path.relative(rootDir, outDir)}`);
}

rmSync(depsDir, { recursive: true, force: true });
