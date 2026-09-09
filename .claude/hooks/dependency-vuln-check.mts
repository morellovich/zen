#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write): audit dependencies when a package.json is touched.
 *
 * One `pnpm audit` at the workspace root — the repo has a single lockfile, so a
 * package.json anywhere in the workspace resolves through it. High/critical
 * advisories block; anything lower is left alone (`pnpm audit` on demand shows
 * those). Audit resolves the *lockfile*, so a manifest edit only shows up here
 * after `pnpm install`; the block message says so.
 */

import { execFileSync } from 'node:child_process';
import { basename, relative, resolve } from 'node:path';

interface HookInput {
  tool_input?: { file_path?: string };
}

interface Advisory {
  module_name: string;
  title: string;
  severity: string;
  vulnerable_versions: string;
  patched_versions: string;
  url: string;
  findings?: { dev?: boolean }[];
}

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString().trim() || '{}');
const filePath = input.tool_input?.file_path;
if (!filePath || basename(filePath) !== 'package.json') process.exit(0);

const rel = relative(ROOT, resolve(ROOT, filePath));
if (rel.startsWith('..')) process.exit(0); // outside the repo

let advisories: Record<string, Advisory>;
try {
  // pnpm audit exits non-zero whenever anything is found; the JSON still lands on stdout.
  const out = execFileSync('pnpm', ['audit', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 90_000,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  advisories = JSON.parse(out).advisories ?? {};
} catch (err) {
  const out = (err as { stdout?: string }).stdout ?? '';
  try {
    advisories = JSON.parse(out).advisories ?? {};
  } catch {
    process.exit(0); // registry unreachable, offline, pnpm crash — advisory hook, stay quiet
  }
}

const blocking = Object.values(advisories).filter(a => ['high', 'critical'].includes(a.severity));
if (!blocking.length) process.exit(0);

const body = blocking
  .map(
    a =>
      `  ${a.severity.toUpperCase()}  ${a.module_name} ${a.vulnerable_versions}` +
      `${a.findings?.every(f => f.dev) ? ' (dev only)' : ''}\n` +
      `    ${a.title}\n    ${a.patched_versions ? `fixed in ${a.patched_versions}` : 'no fix published'} — ${a.url}`
  )
  .join('\n');

process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason:
      `BLOCKED: ${blocking.length} high/critical advisory(ies) in this workspace after editing ${rel}.\n` +
      `${body}\n\n` +
      `Upgrade to the patched range, or record a justified exception in the security policy ` +
      `(a pnpm.overrides entry in the root package.json with a comment) before moving on.\n` +
      `Note: audit resolves pnpm-lock.yaml — run \`pnpm install\` after a manifest change to re-check.`,
  })
);
