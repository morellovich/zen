#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): flag named exports of the edited file that nothing else uses.
 *
 * Barrel-aware: this repo re-exports every lib through index.ts, so a hit that is only
 * `export ... from './x'` is not a use. Advisory: never blocks, and it is a heuristic —
 * exports reached only from Angular templates or DI strings can show up as false hits.
 */

import { execFileSync } from "node:child_process";
import { basename, relative, resolve } from "node:path";
import { reroot } from "./worktree.mts";
import { readFileSync } from "node:fs";

interface HookInput {
  tool_input?: { file_path?: string };
}

const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIP = /(\.spec\.|\.test\.|\.e2e-spec\.|\.d\.ts$|\.config\.|\.stories\.)/;
// Codegen output: nagging about its exports is noise. Mirrors the generated paths in
// eslint.config.mjs `ignores` — ESLint's own isPathIgnored costs ~1s per edit and
// misses generated.ts anyway. ponytail: two literals; widen if codegen moves.
const GENERATED = /(^|\/)generated(\/|\.ts$)|resolversTypes\.ts$|apollo-angular\.ts$/;
let ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const IGNORE = ["!node_modules", "!dist", "!coverage", "!.nx", "!.angular", "!tmp"];

/** `export const X`, `export function X`, `export class X`, type/interface/enum. */
const DECL =
  /^\s*export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;

export function exportedNames(source: string): string[] {
  return [...new Set([...source.matchAll(DECL)].map(m => m[1]))];
}

/**
 * A line that only forwards the symbol onward is a barrel, not a consumer — unless it
 * renames it (`export { X as Y } from`), which publishes X under a name grep won't see,
 * so the export is deliberate public surface and not dead.
 */
const REEXPORT = /^\s*export\b.*\bfrom\b/;
const ALIASED = /\bas\s+[A-Za-z_$][\w$]*/;

function rg(args: string[]): string {
  try {
    return execFileSync("rg", args, {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 20_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return ""; // exit 1 = no matches; anything else we treat the same
  }
}

/** Files that genuinely reference `name`, excluding `self` and pure re-export lines. */
function consumers(name: string, self: string): string[] {
  const hits = rg([
    "-n",
    "-w",
    "--no-heading",
    ...IGNORE.flatMap(g => ["-g", g]),
    ...["ts", "tsx", "js", "jsx", "html"].flatMap(t => ["-g", `*.${t}`]),
    "--",
    name,
    ".",
  ]);
  const byFile = new Map<string, string[]>();
  for (const line of hits.split("\n")) {
    const m = /^(.+?):\d+:(.*)$/.exec(line);
    if (!m) continue;
    const file = m[1].replace(/^\.\//, "");
    if (file === self) continue;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file)!.push(m[2]);
  }
  return [...byFile]
    .filter(([, lines]) => lines.some(l => !REEXPORT.test(l) || ALIASED.test(l)))
    .map(([file]) => file);
}

if (process.argv[2] === "--selftest") {
  const assert = await import("node:assert/strict");
  assert.deepEqual(
    exportedNames(
      [
        "export const a = 1;",
        "export function b() {}",
        "export abstract class C {}",
        "export interface D {}",
        "export type E = string;",
        "export enum F {}",
        "export default thing;", // not named
        "export { g } from './g';", // re-export, not a declaration
        "const notExported = 2;",
        "  export async function h() {}",
      ].join("\n"),
    ),
    ["a", "b", "C", "D", "E", "F", "h"],
  );
  assert.ok(REEXPORT.test("export * from './lib/x';"));
  assert.ok(REEXPORT.test("export { Foo } from './foo';"));
  assert.ok(!REEXPORT.test("import { Foo } from './foo';"));
  assert.ok(!REEXPORT.test("export const Foo = 1;"));
  assert.ok(ALIASED.test("export type { Foo as Bar } from './foo';"));
  assert.ok(!ALIASED.test("export { Foo } from './foo';"));
  for (const g of [
    "apps/api/src/app/auth/casl/generated.ts",
    "apps/api/src/app/prisma/generated/index.ts",
    "apps/api/src/app/graphql/resolversTypes.ts",
    "libs/graphql/src/lib/apollo-angular.ts",
  ])
    assert.ok(GENERATED.test(g), g);
  assert.ok(!GENERATED.test("apps/api/src/app/auth/casl/casl.factory.ts"));
  console.log("ok");
  process.exit(0);
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString() || "{}");
const filePath = input.tool_input?.file_path;
if (!filePath || !CODE.test(filePath)) process.exit(0);
if (SKIP.test(filePath) || GENERATED.test(filePath)) process.exit(0);
if (basename(filePath).startsWith("index.")) process.exit(0); // barrels export by definition

const abs = resolve(ROOT, filePath);
ROOT = reroot(ROOT, abs); // superspec's apply phase writes inside `.worktrees/<change>/`
const rel = relative(ROOT, abs);
if (rel.startsWith("..")) process.exit(0);

let source: string;
try {
  source = readFileSync(resolve(ROOT, rel), "utf8");
} catch {
  process.exit(0);
}

const dead = exportedNames(source).filter(name => consumers(name, rel).length === 0);
if (!dead.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `Possibly dead exports in ${rel} — nothing outside this file references them ` +
        `(barrel re-exports don't count; templates/DI strings may hide a real use):\n` +
        dead.map(n => `  ${n}`).join("\n"),
    },
  }),
);
