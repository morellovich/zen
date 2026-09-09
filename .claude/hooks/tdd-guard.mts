#!/usr/bin/env node
/**
 * PreToolUse(Edit|Write): refuse to create new implementation code that has no test yet.
 *
 * Scoped to *new* files. The repo has 237 implementation files and 11 specs, so guarding
 * every edit would wall off the untested majority instead of enforcing TDD — new code has
 * to arrive test-first, existing code is not retroactively locked.
 *
 * A file counts as covered by either convention in this repo:
 *   - the colocated sibling spec (`auth.service.ts` -> `auth.service.spec.ts`), or
 *   - a spec in the sibling e2e project (`apps/*-e2e/src/**\/*.spec.ts`) that names it.
 *
 * Only things this repo actually specs are guarded (service/controller/guard/component/
 * util); modules, routes, .gql, stories and barrels are exempt. Blocks: deny + the exact
 * spec path to write first. `ZEN_TDD_GUARD=off` disables it.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { reroot } from './worktree.mts';

interface HookInput {
  tool_input?: { file_path?: string };
}

let ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

/** Nx source trees only — tools/, deploy/, root configs are not application code. */
const SRC = /^(apps|libs)\/[^/]+\/src\//;

/** Suffixes this repo writes specs for, plus plain `name.ts` utilities (no dotted suffix). */
const TESTABLE =
  /\.(service|controller|resolver|guard|interceptor|pipe|directive|component|validator|decorator|strategy|filter)\.ts$|(^|\/)[^./]+\.ts$/;

/**
 * Not unit-testable or not hand-written: DI wiring, route tables, codegen'd documents and
 * types, Storybook, barrels, bootstrap, environments, the e2e projects themselves.
 */
const SKIP =
  /(^|\/)(index|main|typeDefs|context|test-setup|polyfills|environment)\.ts$|\.(d|spec|stories|gql|module|routes|config|prod)\.ts$|(^|\/)generated(\/|\.ts$)|(^|\/)[^/]*-e2e\//;

export function guarded(rel: string): boolean {
  return SRC.test(rel) && TESTABLE.test(rel) && !SKIP.test(rel);
}

/** `foo.service.ts` -> `foo.service.spec.ts`. Mirrors auto-test.mts's colocated mapping. */
export function specFor(rel: string): string {
  return rel.replace(/\.ts$/, '.spec.ts');
}

/** Every `*.spec.ts` under an `apps/*-e2e` project, repo-relative. */
export function e2eSpecs(root = ROOT): string[] {
  let projects: string[];
  try {
    projects = readdirSync(join(root, 'apps')).filter(name => name.endsWith('-e2e'));
  } catch {
    return [];
  }
  return projects.flatMap(project => {
    const src = join('apps', project, 'src');
    try {
      return readdirSync(join(root, src), { recursive: true })
        .map(String)
        .filter(entry => entry.endsWith('.spec.ts'))
        .map(entry => join(src, entry));
    } catch {
      return [];
    }
  });
}

/**
 * An e2e spec covers a file if it names it — the stem is what an import or a describe
 * block spells out (`auth.service`, `zen-table.component`).
 * ponytail: textual, so an e2e spec that only reaches the file through a barrel alias
 * reads as uncovered. Match on exported symbols if that turns into false denials.
 */
export function coveredByE2e(rel: string, specs: string[], read = readFileSync): boolean {
  const stem = basename(rel, '.ts');
  return specs.some(spec => {
    try {
      return String(read(join(ROOT, spec), 'utf8')).includes(stem);
    } catch {
      return false;
    }
  });
}

if (process.argv[2] === '--selftest') {
  const assert = await import('node:assert/strict');

  assert.ok(guarded('libs/auth/src/lib/auth.service.ts'));
  assert.ok(guarded('apps/api/src/app/auth/auth.controller.ts'));
  assert.ok(guarded('libs/components/src/lib/zen-table/zen-table.component.ts'));
  assert.ok(guarded('libs/common/src/lib/trim-object-strings.ts')); // plain util
  assert.ok(!guarded('libs/graphql/src/lib/zen-graphql.module.ts')); // DI wiring
  assert.ok(!guarded('libs/portal/src/lib/zen-portal.routes.ts'));
  assert.ok(!guarded('libs/graphql/src/lib/graphql/User.gql.ts')); // codegen
  assert.ok(!guarded('libs/auth/src/lib/zen-register-form.component.stories.ts'));
  assert.ok(!guarded('libs/common/src/index.ts')); // barrel
  assert.ok(!guarded('apps/api/src/main.ts'));
  assert.ok(!guarded('apps/portal/src/environments/environment.prod.ts'));
  assert.ok(!guarded('apps/api/src/app/prisma/generated/index.ts'));
  assert.ok(!guarded('apps/api-e2e/src/api/api.spec.ts')); // the e2e project itself
  assert.ok(!guarded('libs/auth/src/lib/auth.service.spec.ts')); // writing the spec is allowed
  assert.ok(!guarded('tools/scripts/seed.ts')); // outside apps/libs src
  assert.ok(!guarded('.claude/hooks/tdd-guard.mts'));

  assert.equal(
    specFor('libs/auth/src/lib/auth.service.ts'),
    'libs/auth/src/lib/auth.service.spec.ts'
  );

  const specs = e2eSpecs();
  assert.deepEqual(specs.sort(), [
    join('apps', 'api-e2e', 'src', 'api', 'api.spec.ts'),
    join('apps', 'portal-e2e', 'src', 'example.spec.ts'),
  ]);

  // Reads the real e2e specs: one says "Sample test", neither mentions auth.service.
  assert.ok(coveredByE2e('libs/x/src/lib/Sample test.ts', specs));
  assert.ok(!coveredByE2e('libs/auth/src/lib/auth.service.ts', specs));
  assert.ok(!coveredByE2e('libs/auth/src/lib/auth.service.ts', [])); // no e2e projects
  console.log('ok');
  process.exit(0);
}

if (process.env.ZEN_TDD_GUARD === 'off') process.exit(0);

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString() || '{}');
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const abs = resolve(ROOT, filePath);
ROOT = reroot(ROOT, abs); // superspec's apply phase writes inside `.worktrees/<change>/`
const rel = relative(ROOT, abs);
if (rel.startsWith('..')) process.exit(0); // outside the repo
if (existsSync(abs)) process.exit(0); // editing existing code, not adding new
if (!guarded(rel)) process.exit(0);

const spec = specFor(rel);
if (existsSync(join(ROOT, spec))) process.exit(0);
if (coveredByE2e(rel, e2eSpecs())) process.exit(0);

const project = dirname(rel).replace(/^(apps|libs)\/([^/]+)\/.*$/, '$2');

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `BLOCKED: ${rel} is new implementation code with no test.\n` +
        `Write the failing test first, then create it:\n` +
        `  - unit (preferred): ${spec}, run with \`pnpm exec nx test ${project}\`\n` +
        `  - or an e2e spec under apps/*-e2e/src that names \`${basename(rel, '.ts')}\`\n` +
        `Editing existing files is unaffected; barrels, modules, routes, .gql and stories are exempt.`,
    },
  })
);
