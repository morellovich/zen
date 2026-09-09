#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): run the spec that sits next to the edited file.
 *
 * Specs are colocated in this repo (`auth.service.ts` -> `auth.service.spec.ts`, and a
 * component's template maps to its component spec), so the sibling is the only candidate —
 * no repo-wide search. Tests run through `nx test <project>` so the project's own
 * jest.config.ts/tsconfig.spec.json apply (jest-preset-angular vs ts-jest), with the Nx
 * cache left on: an untouched project replays instantly. Advisory: never blocks.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { reroot } from './worktree.mts';

interface HookInput {
  tool_input?: { file_path?: string };
}

const CODE = /\.(ts|mts|cts|js|mjs|html)$/;
const SKIP = /(\.d\.ts$|\.config\.|\.e2e-spec\.|\.stories\.)/;
let ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

/** `foo.service.ts` | `foo.component.html` -> `foo.{service,component}.spec.ts`. */
export function specFor(file: string): string {
  return /\.spec\.ts$/.test(file) ? file : file.replace(CODE, '.spec.ts');
}

/** Nearest project.json at or above `dir`, if it declares a `test` target. */
export function testableProject(
  dir: string,
  exists = existsSync,
  read = readFileSync
): string | null {
  for (let cur = dir; cur && cur !== '.'; cur = dirname(cur)) {
    const manifest = join(cur, 'project.json');
    if (!exists(join(ROOT, manifest))) continue;
    try {
      const project = JSON.parse(String(read(join(ROOT, manifest), 'utf8')));
      return project.targets?.test ? project.name : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Jest's --testPathPatterns is a regex against the absolute path; the literal path has
 * dots that would otherwise match anything.
 */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ANSI = /\[[0-9;]*m/g;
/** Failure markers worth showing; jest's stack frames and passing noise are dropped. */
const SIGNAL =
  /^(?:●|✕|FAIL\b|Tests:|Test Suites:|(?:Expected|Received|Difference)\b)|\berror TS\d+:/;

export function summarize(output: string, project: string): string {
  const lines = output
    .replace(ANSI, '')
    .split('\n')
    .map(l => l.replace(new RegExp(`^${escapeRe(project)}: ?`), '').trimEnd())
    .filter(l => SIGNAL.test(l.trimStart()) || SIGNAL.test(l));
  return [...new Set(lines)].slice(0, 40).join('\n');
}

if (process.argv[2] === '--selftest') {
  const assert = await import('node:assert/strict');
  assert.equal(
    specFor('libs/auth/src/lib/auth.service.ts'),
    'libs/auth/src/lib/auth.service.spec.ts'
  );
  assert.equal(
    specFor('libs/components/src/lib/zen-table/zen-table.component.html'),
    'libs/components/src/lib/zen-table/zen-table.component.spec.ts'
  );
  assert.equal(specFor('a/b.spec.ts'), 'a/b.spec.ts'); // already a spec, run itself
  assert.equal(escapeRe('a.spec.ts'), 'a\\.spec\\.ts');

  const files: Record<string, string> = {
    [join(ROOT, 'libs/auth/project.json')]: '{"name":"auth","targets":{"test":{}}}',
    [join(ROOT, 'apps/portal-e2e/project.json')]: '{"name":"portal-e2e","targets":{"e2e":{}}}',
  };
  const exists = (p: string) => p in files;
  const read = ((p: string) => files[p]) as unknown as typeof readFileSync;
  assert.equal(testableProject('libs/auth/src/lib', exists, read), 'auth'); // walks up
  assert.equal(testableProject('apps/portal-e2e/src', exists, read), null); // no test target
  assert.equal(testableProject('tools', exists, read), null); // no project.json

  assert.equal(
    summarize(
      [
        'auth: ● AuthService › logs in',
        'auth:     Expected: true',
        'auth:     Received: false',
        'auth:       at Object.<anonymous> (src/lib/auth.service.spec.ts:12:5)',
        'auth: [1mTests:       [22m1 failed, 3 passed',
      ].join('\n'),
      'auth'
    ),
    [
      '● AuthService › logs in',
      '    Expected: true',
      '    Received: false',
      'Tests:       1 failed, 3 passed',
    ].join('\n')
  );
  // A compile error fails the suite before any test runs; keep the TS diagnostic.
  assert.equal(
    summarize(
      [
        'common:  FAIL   common  libs/common/src/lib/enum-helper.spec.ts',
        'common:   ● Test suite failed to run',
        "common:     libs/common/src/lib/enum-helper.ts:50:14 - error TS2322: Type 'string' is not assignable.",
        "common:     50 export const __brk: number = 'nope';",
        'common: Test Suites: 1 failed, 1 total',
      ].join('\n'),
      'common'
    ),
    [
      ' FAIL   common  libs/common/src/lib/enum-helper.spec.ts',
      '  ● Test suite failed to run',
      "    libs/common/src/lib/enum-helper.ts:50:14 - error TS2322: Type 'string' is not assignable.",
      'Test Suites: 1 failed, 1 total',
    ].join('\n')
  );
  console.log('ok');
  process.exit(0);
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString() || '{}');
const filePath = input.tool_input?.file_path;
if (!filePath || !CODE.test(filePath) || SKIP.test(filePath)) process.exit(0);

const abs = resolve(ROOT, filePath);
ROOT = reroot(ROOT, abs); // superspec's apply phase writes inside `.worktrees/<change>/`
const rel = relative(ROOT, abs);
if (rel.startsWith('..')) process.exit(0); // outside the repo
if (!existsSync(join(ROOT, 'node_modules'))) process.exit(0); // worktree without `pnpm install`

const spec = specFor(rel);
if (!existsSync(join(ROOT, spec))) process.exit(0); // nothing colocated to run

const project = testableProject(dirname(spec));
if (!project) process.exit(0);

let output: string;
try {
  execFileSync(
    'pnpm',
    [
      'exec',
      'nx',
      'test',
      project,
      `--testPathPatterns=${escapeRe(spec)}`,
      '--output-style=stream',
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  process.exit(0); // green — say nothing
} catch (err) {
  const e = err as { stdout?: string; stderr?: string; signal?: string };
  if (e.signal) process.exit(0); // timed out or killed; not a test failure
  output = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `\`nx test ${project}\` fails on ${spec} after your edit to ${rel}:\n` +
        (summarize(output, project) || '(no jest summary — run the command yourself for detail)'),
    },
  })
);
