#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): warn when the edited file's own test coverage sits below
 * the threshold, and name the lines that are missing.
 *
 * Per *file*, not per project: jest here has no `collectCoverageFrom`, so a project
 * total only ever measures the handful of files its 11 specs happen to import — `common`
 * reads 100% while 200-odd untested files are invisible. The edited file's own number is
 * the one that means something, and `coverage-final.json` carries the uncovered lines
 * with it, so the warning can point at what to test instead of just scoring it.
 *
 * Runs the colocated sibling spec only (`auth.service.ts` -> `auth.service.spec.ts`,
 * a template maps to its component), through `nx test <project>` so the project's own
 * jest.config.ts applies — same mapping auto-test.mts uses. No spec, no run: a file with
 * no test at all is tdd-guard.mts's business, not this hook's.
 *
 * Advisory: never blocks. `ZEN_COVERAGE_GUARD=off` disables it,
 * `ZEN_COVERAGE_THRESHOLD` (default 80) sets the bar.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { reroot } from './worktree.mts';

interface HookInput {
  tool_input?: { file_path?: string };
}

/** Istanbul's per-file entry, trimmed to the statement map this hook reads. */
interface FileCoverage {
  statementMap: Record<string, { start: { line: number } }>;
  s: Record<string, number>;
}

const CODE = /\.(ts|mts|cts|js|mjs|html)$/;
const SKIP = /(\.d\.ts$|\.spec\.ts$|\.config\.|\.e2e-spec\.|\.stories\.)/;
let ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const THRESHOLD = Number(process.env.ZEN_COVERAGE_THRESHOLD ?? 80);

/** Coverage lands under the gitignored `tmp/`: nx joins coverageDirectory onto ROOT. */
const COVERAGE_DIR = 'tmp/.coverage-guard';

/** `foo.service.ts` | `foo.component.html` -> `foo.{service,component}.spec.ts`. */
export function specFor(file: string): string {
  return file.replace(CODE, '.spec.ts');
}

/**
 * The file coverage is keyed by. A template is never instrumented on its own — its
 * statements belong to the component class, so an html edit is scored against the
 * sibling `.ts`.
 */
export function coverageTarget(file: string): string {
  return file.replace(/\.html$/, '.ts');
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

/** --testPathPatterns is a regex against the absolute path; literal dots match anything. */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Statement coverage for `target`, plus the lines with no statement hit. `null` when the
 * spec never loads the file — nothing was measured, so there is nothing to report.
 */
export function fileCoverage(
  report: Record<string, FileCoverage>,
  target: string
): { pct: number; uncovered: number[] } | null {
  const abs = join(ROOT, target);
  const entry = report[abs] ?? report[target];
  if (!entry) return null;

  const ids = Object.keys(entry.s);
  if (!ids.length) return null; // a file of pure types/interfaces has no statements

  const missed = ids.filter(id => entry.s[id] === 0);
  const uncovered = [...new Set(missed.map(id => entry.statementMap[id].start.line))].sort(
    (a, b) => a - b
  );
  return { pct: ((ids.length - missed.length) / ids.length) * 100, uncovered };
}

/** `[1,2,3,7,9,10]` -> `1-3, 7, 9-10`; a long tail is elided rather than wrapped. */
export function formatLines(lines: number[], max = 12): string {
  const ranges: string[] = [];
  for (let i = 0; i < lines.length;) {
    let end = i;
    while (end + 1 < lines.length && lines[end + 1] === lines[end] + 1) end++;
    ranges.push(lines[i] === lines[end] ? `${lines[i]}` : `${lines[i]}-${lines[end]}`);
    i = end + 1;
  }
  return ranges.length > max
    ? `${ranges.slice(0, max).join(', ')} (+${ranges.length - max} more)`
    : ranges.join(', ');
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

  assert.equal(
    coverageTarget('libs/auth/src/lib/inputs/zen-email-input/zen-email-input.component.html'),
    'libs/auth/src/lib/inputs/zen-email-input/zen-email-input.component.ts'
  );
  assert.equal(
    coverageTarget('libs/auth/src/lib/auth.service.ts'),
    'libs/auth/src/lib/auth.service.ts'
  );

  const files: Record<string, string> = {
    [join(ROOT, 'libs/auth/project.json')]: '{"name":"auth","targets":{"test":{}}}',
    [join(ROOT, 'apps/portal-e2e/project.json')]: '{"name":"portal-e2e","targets":{"e2e":{}}}',
  };
  const exists = (p: string) => p in files;
  const read = ((p: string) => files[p]) as unknown as typeof readFileSync;
  assert.equal(testableProject('libs/auth/src/lib', exists, read), 'auth'); // walks up
  assert.equal(testableProject('apps/portal-e2e/src', exists, read), null); // no test target
  assert.equal(testableProject('tools', exists, read), null); // no project.json

  const target = 'libs/auth/src/lib/auth.service.ts';
  const report: Record<string, FileCoverage> = {
    [join(ROOT, target)]: {
      statementMap: {
        '0': { start: { line: 10 } },
        '1': { start: { line: 11 } },
        '2': { start: { line: 20 } },
        '3': { start: { line: 21 } },
      },
      s: { '0': 3, '1': 0, '2': 0, '3': 1 },
    },
    [join(ROOT, 'libs/auth/src/lib/types.ts')]: { statementMap: {}, s: {} },
  };
  const hit = fileCoverage(report, target);
  assert.equal(hit?.pct, 50);
  assert.deepEqual(hit?.uncovered, [11, 20]);
  assert.equal(fileCoverage(report, 'libs/auth/src/lib/types.ts'), null); // no statements
  assert.equal(fileCoverage(report, 'libs/auth/src/lib/absent.ts'), null); // spec never loads it

  assert.equal(formatLines([]), '');
  assert.equal(formatLines([4]), '4');
  assert.equal(formatLines([1, 2, 3, 7, 9, 10]), '1-3, 7, 9-10');
  assert.equal(formatLines([1, 3, 5, 7], 2), '1, 3 (+2 more)');

  assert.equal(escapeRe('a.spec.ts'), 'a\\.spec\\.ts');
  console.log('ok');
  process.exit(0);
}

if (process.env.ZEN_COVERAGE_GUARD === 'off') process.exit(0);

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString().trim() || '{}');
const filePath = input.tool_input?.file_path;
if (!filePath || !CODE.test(filePath) || SKIP.test(filePath)) process.exit(0);

const abs = resolve(ROOT, filePath);
ROOT = reroot(ROOT, abs); // superspec's apply phase writes inside `.worktrees/<change>/`
const rel = relative(ROOT, abs);
if (rel.startsWith('..')) process.exit(0); // outside the repo

const spec = specFor(rel);
if (!existsSync(join(ROOT, spec))) process.exit(0); // untested file — tdd-guard's job

const project = testableProject(dirname(spec));
if (!project) process.exit(0);

/**
 * --skip-nx-cache on purpose: coverageDirectory is not a declared output of the test
 * target, so a cache hit replays the run without writing the report and the hook would
 * read a stale or missing file and pass silently.
 */
const outDir = join(ROOT, COVERAGE_DIR, project);
const discard = () => rmSync(outDir, { recursive: true, force: true });
process.on('exit', discard); // the report is scratch, and a failing suite exits early
discard();
try {
  execFileSync(
    'pnpm',
    [
      'exec',
      'nx',
      'test',
      project,
      `--testPathPatterns=${escapeRe(spec)}`,
      '--skip-nx-cache',
      '--codeCoverage',
      '--coverageReporters=json',
      `--coverageDirectory=${relative(ROOT, outDir)}`, // nx joins this onto the workspace root
      '--output-style=stream',
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 180_000, stdio: 'ignore' }
  );
} catch {
  process.exit(0); // a failing or killed suite is auto-test.mts's report to make, not this one's
}

const reportPath = join(outDir, 'coverage-final.json');
if (!existsSync(reportPath)) process.exit(0);

let coverage: { pct: number; uncovered: number[] } | null;
try {
  coverage = fileCoverage(JSON.parse(readFileSync(reportPath, 'utf8')), coverageTarget(rel));
} catch {
  process.exit(0);
}

if (!coverage || coverage.pct >= THRESHOLD) process.exit(0); // at or above the bar — say nothing

const pct = coverage.pct.toFixed(1);
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `Coverage of ${coverageTarget(rel)} is ${pct}% of statements, under the ${THRESHOLD}% ` +
        `threshold, measured by ${spec} after your edit to ${rel}.\n` +
        `Untested lines: ${formatLines(coverage.uncovered)}\n` +
        `Extend ${spec} to reach them, then \`pnpm exec nx test ${project}\`.`,
    },
  })
);
