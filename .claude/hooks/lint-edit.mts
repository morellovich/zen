#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): format + autofix the edited file, then report what's left.
 *
 * Rules come from eslint.config.mjs verbatim (Angular selectors, a11y templates,
 * Nx module boundaries, no-unused-vars, ...) — nothing is duplicated here.
 * Errors are always reported; warnings only on lines changed vs HEAD, so a file's
 * pre-existing noise doesn't drown the edit. Advisory: never blocks.
 */

import { execFileSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

import { reroot } from './worktree.mts';

interface HookInput {
  tool_input?: { file_path?: string };
}

interface Message {
  ruleId: string | null;
  severity: number;
  line?: number;
  message: string;
}

const LINTABLE = /\.(ts|tsx|cts|mts|js|jsx|cjs|mjs|html)$/;
let ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 45_000,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** Lines added/changed vs HEAD. Untracked or no git => every line counts. */
function touchedLines(file: string): Set<number> | null {
  let diff: string;
  try {
    diff = run('git', ['diff', '-U0', 'HEAD', '--', file]);
  } catch {
    return null;
  }
  if (!diff.trim()) return null;

  const lines = new Set<number>();
  for (const [, start, count] of diff.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
    const from = Number(start);
    for (let i = 0; i < Number(count ?? 1); i++) lines.add(from + i);
  }
  return lines;
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString() || '{}');
const filePath = input.tool_input?.file_path;
if (!filePath || !LINTABLE.test(filePath)) process.exit(0);

const abs = resolve(ROOT, filePath);
ROOT = reroot(ROOT, abs); // superspec's apply phase writes inside `.worktrees/<change>/`
const rel = relative(ROOT, abs);
if (rel.startsWith('..')) process.exit(0); // outside the repo

// Prettier first (formatter of record), then eslint --fix on the formatted text.
try {
  run('pnpm', ['exec', 'prettier', '--write', '--ignore-unknown', rel]);
} catch {
  /* unparseable or prettier-ignored — eslint will still have its say */
}

let messages: Message[] = [];
try {
  // eslint exits 1 when problems remain; the JSON still lands on stdout.
  const out = execFileSync('pnpm', ['exec', 'eslint', '--fix', '--format', 'json', rel], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 45_000,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  messages = JSON.parse(out)[0]?.messages ?? [];
} catch (err) {
  const out = (err as { stdout?: string }).stdout ?? '';
  try {
    messages = JSON.parse(out)[0]?.messages ?? [];
  } catch {
    process.exit(0); // eslint itself blew up (no config, parse crash) — stay quiet
  }
}

const touched = touchedLines(rel);
const report = messages.filter(
  m => m.severity === 2 || touched === null || touched.has(m.line ?? 0)
);
if (!report.length) process.exit(0);

const body = report
  .map(
    m =>
      `  ${rel}:${m.line ?? 0}  ${m.severity === 2 ? 'error' : 'warning'}  ${m.message}` +
      (m.ruleId ? `  (${m.ruleId})` : '')
  )
  .join('\n');

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `Lint after editing ${rel} (already auto-fixed and formatted; these remain — ` +
        `errors always, warnings only on lines you changed):\n${body}`,
    },
  })
);

// Exit 1 == errors remain. Only chain.mts, this hook's parent, ever sees it — that is the
// signal it gates the test stage on, so a failing lint never has jest run behind it.
process.exit(report.some(m => m.severity === 2) ? 1 : 0);
