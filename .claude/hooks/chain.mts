#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): the single entry that runs the other Edit/Write hooks in order.
 *
 * Claude Code fires every hook registered for an event *in parallel* and offers no
 * ordering, priority or dependency field — so two things went wrong when these were five
 * separate entries: test-edit.mts read the file while lint-edit.mts was still rewriting it
 * (prettier --write, then eslint --fix), and the suite ran on code that had not passed lint.
 * Sequencing is only possible inside one hook, which is what this is.
 *
 *   stage 1 (parallel)                     stage 2
 *   ├ lint-edit.mts       ──┐              └ test-edit.mts
 *   ├ dead-exports.mts      │
 *   └ dependency-vuln-check │
 *                           └─ eslint errors? ─▶ skip stage 2, say why
 *
 * dead-exports and dependency-vuln-check share stage 1 because neither depends on lint;
 * keeping them concurrent costs nothing. Stage 2 waits for all of stage 1, so the file is
 * settled before jest opens it — that alone fixes the race, gate or no gate.
 *
 * Only *errors* (eslint severity 2) skip the tests; warnings never do. lint-edit.mts exits
 * 1 to signal them — an exit code only this parent ever sees.
 *
 * A hook may emit at most one JSON object, so the children's reports are merged into one.
 * `ZEN_CHAIN_DEBUG=1` traces the stage boundaries on stderr.
 */

import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Timeouts carried over from the per-entry `timeout` each hook had in settings.json. */
const STAGE_1: Record<string, number> = {
  'lint-edit.mts': 60_000,
  'dead-exports.mts': 20_000,
  'dependency-vuln-check.mts': 120_000,
};
const STAGE_2: Record<string, number> = { 'test-edit.mts': 180_000 };

/** The one hook whose exit code gates stage 2. */
const GATE = 'lint-edit.mts';

interface Outcome {
  hook: string;
  stdout: string;
  /** Non-zero from the gate hook means eslint errors remain. */
  failed: boolean;
}

interface Report {
  context?: string;
  block?: string;
}

/**
 * What a child said. Children emit either nothing, a PostToolUse `additionalContext`
 * envelope, or — dependency-vuln-check — a top-level `{decision:'block', reason}`.
 * Anything unparseable is dropped rather than passed on as text: a half-written object
 * would take the whole merged payload down with it.
 */
export function parse(stdout: string): Report {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return {};
  try {
    const out = JSON.parse(trimmed);
    return {
      context: out.hookSpecificOutput?.additionalContext,
      block: out.decision === 'block' ? out.reason : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * One object for the whole chain. A blocking child wins the envelope and carries the
 * advisory reports with it, so nothing a sibling said is lost to the block.
 */
export function merge(reports: Report[]): object | null {
  const blocks = reports.map(r => r.block).filter(Boolean);
  const contexts = reports.map(r => r.context).filter(Boolean);
  if (blocks.length) return { decision: 'block', reason: [...blocks, ...contexts].join('\n\n') };
  if (!contexts.length) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: contexts.join('\n\n'),
    },
  };
}

if (process.argv[2] === '--selftest') {
  const assert = await import('node:assert/strict');

  const ctx = (s: string) =>
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: s } });

  assert.deepEqual(parse(''), {}); // silent hook
  assert.deepEqual(parse('  \n'), {});
  assert.deepEqual(parse('not json'), {});
  assert.deepEqual(parse('{"broken":'), {}); // truncated child
  assert.deepEqual(parse(`${ctx('a')}${ctx('b')}`), {}); // two objects: not one payload
  assert.deepEqual(parse(ctx('lint says x')), { context: 'lint says x', block: undefined });
  assert.deepEqual(parse(JSON.stringify({ decision: 'block', reason: 'CVE' })), {
    context: undefined,
    block: 'CVE',
  });
  // `decision` without a block verdict is not a block.
  assert.deepEqual(parse(JSON.stringify({ decision: 'approve', reason: 'fine' })), {
    context: undefined,
    block: undefined,
  });

  assert.equal(merge([]), null);
  assert.equal(merge([{}, {}]), null); // every child silent
  assert.deepEqual(merge([{ context: 'a' }, {}, { context: 'b' }]), {
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'a\n\nb' },
  });
  assert.deepEqual(merge([{ context: 'a' }, { block: 'stop' }]), {
    decision: 'block',
    reason: 'stop\n\na', // the block leads, the advisory rides along
  });
  assert.deepEqual(merge([{ block: 'x' }, { block: 'y' }]), {
    decision: 'block',
    reason: 'x\n\ny',
  });
  console.log('ok');
  process.exit(0);
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
const payload = Buffer.concat(chunks).toString();

const trace = (msg: string): void => {
  if (process.env.ZEN_CHAIN_DEBUG) process.stderr.write(`[chain] ${msg}\n`);
};

const HOOKS = import.meta.dirname;

/**
 * Every child gets the same event payload on stdin. A child that crashes or times out is
 * reported as silent — this runner never turns a hook's own failure into a block.
 */
async function stage(hooks: Record<string, number>): Promise<Outcome[]> {
  return Promise.all(
    Object.entries(hooks).map(async ([hook, timeout]) => {
      const child = run('node', [join(HOOKS, hook)], { timeout, encoding: 'utf8' });
      child.child.stdin?.end(payload);
      try {
        const { stdout } = await child;
        return { hook, stdout, failed: false };
      } catch (err) {
        const e = err as { stdout?: string; code?: number; signal?: string };
        trace(`${hook} exited ${e.signal ?? e.code}`);
        return { hook, stdout: e.stdout ?? '', failed: !e.signal };
      }
    })
  );
}

trace('stage 1');
const first = await stage(STAGE_1);
const reports = first.map(o => parse(o.stdout));

const blocked = first.find(o => o.hook === GATE && o.failed);
if (blocked) {
  trace('stage 2 skipped: eslint errors');
  reports.push({
    context:
      'Tests skipped — eslint errors remain (see above); fix them and the next edit runs ' +
      'the suite. To run it now: `pnpm exec nx test <project>`.',
  });
} else {
  trace('stage 2');
  reports.push(...(await stage(STAGE_2)).map(o => parse(o.stdout)));
}

const merged = merge(reports);
if (merged) process.stdout.write(JSON.stringify(merged));
