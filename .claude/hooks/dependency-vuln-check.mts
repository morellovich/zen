#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): audit dependencies when a package.json is touched.
 *
 * One `pnpm audit` per worktree root — a workspace has a single lockfile, so a
 * package.json anywhere in it resolves through that one. High/critical advisories
 * block; anything lower is left alone (`pnpm audit` on demand shows those).
 * Audit resolves the *lockfile*, so a manifest edit only shows up here after
 * `pnpm install`; the block message says so.
 */

import { execFileSync } from 'node:child_process';
import { basename, relative, resolve } from 'node:path';
import { reroot } from './worktree.mts';

interface HookInput {
  tool_input?: { file_path?: string };
}

interface Advisory {
  module_name: string;
  title: string;
  severity: string;
  vulnerable_versions: string;
  /** null when the advisory has no published fix yet. */
  patched_versions: string | null;
  url: string;
  findings?: { dev?: boolean }[];
}

let ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const BLOCKING = ['high', 'critical'];

export function blocking(advisories: Record<string, Advisory>): Advisory[] {
  return Object.values(advisories).filter(a => BLOCKING.includes(a.severity));
}

/** Findings that are all dev paths still block, but say so — the urgency differs. */
export function describe(a: Advisory): string {
  return (
    `  ${a.severity.toUpperCase()}  ${a.module_name} ${a.vulnerable_versions}` +
    `${a.findings?.every(f => f.dev) ? ' (dev only)' : ''}\n` +
    `    ${a.title}\n    ` +
    `${a.patched_versions ? `fixed in ${a.patched_versions}` : 'no fix published'} — ${a.url}`
  );
}

/** `advisories` from pnpm audit --json, whether it exits 0 or non-zero. */
function audit(): Record<string, Advisory> | undefined {
  try {
    // pnpm audit exits non-zero whenever anything is found; the JSON still lands on stdout.
    const out = execFileSync('pnpm', ['audit', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 90_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(out).advisories ?? {};
  } catch (err) {
    try {
      return JSON.parse((err as { stdout?: string }).stdout ?? '').advisories ?? {};
    } catch {
      return undefined; // registry unreachable, offline, pnpm crash — stay quiet
    }
  }
}

if (process.argv[2] === '--selftest') {
  const assert = await import('node:assert/strict');
  const base: Advisory = {
    module_name: 'x',
    title: 't',
    severity: 'high',
    vulnerable_versions: '<1',
    patched_versions: '>=1',
    url: 'u',
  };

  assert.deepEqual(
    blocking({
      a: { ...base, severity: 'low' },
      b: { ...base, severity: 'moderate' },
      c: { ...base, severity: 'high' },
      d: { ...base, severity: 'critical' },
    }).map(a => a.severity),
    ['high', 'critical']
  );
  assert.deepEqual(blocking({}), []);

  assert.ok(describe({ ...base, findings: [{ dev: true }, { dev: true }] }).includes('(dev only)'));
  assert.ok(!describe({ ...base, findings: [{ dev: true }, { dev: false }] }).includes('dev only'));
  assert.ok(!describe(base).includes('dev only')); // absent findings is not "dev only"
  assert.ok(describe({ ...base, patched_versions: null }).includes('no fix published'));
  assert.ok(describe(base).includes('fixed in >=1'));
  console.log('ok');
  process.exit(0);
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString().trim() || '{}');
const filePath = input.tool_input?.file_path;
if (!filePath || basename(filePath) !== 'package.json') process.exit(0);

const abs = resolve(ROOT, filePath);
ROOT = reroot(ROOT, abs); // audit the worktree's own lockfile, not the main checkout's
const rel = relative(ROOT, abs);
if (rel.startsWith('..')) process.exit(0); // outside the repo

const advisories = audit();
if (!advisories) process.exit(0);

const found = blocking(advisories);
if (!found.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason:
      `BLOCKED: ${found.length} high/critical advisory(ies) in this workspace after editing ${rel}.\n` +
      `${found.map(describe).join('\n')}\n\n` +
      `Upgrade to the patched range, or record a justified exception in the security policy ` +
      `(a pnpm.overrides entry in the root package.json with a comment) before moving on.\n` +
      `Note: audit resolves pnpm-lock.yaml — run \`pnpm install\` after a manifest change to re-check.`,
  })
);
