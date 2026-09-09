#!/usr/bin/env node
/**
 * Stop: warn when the repo's Node/pnpm version declarations have drifted apart.
 *
 * This monorepo pins its toolchain in five places — .nvmrc, .node-version,
 * package.json `engines.node` / `engines.pnpm` / `packageManager`, and the
 * `FROM node:` line of every Dockerfile. They are edited independently, so they
 * rot independently. Advisory only: never blocks the turn.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

interface Declaration {
  /** Where a human goes to fix it. */
  source: string;
  /** Verbatim text, so the warning shows what is actually written. */
  raw: string;
  major: number;
}

/** First `major` of a range/pin: `24.20.0`, `>=24.0.0`, `24-alpine`, `^12.3.4`. */
export function major(raw: string): number | undefined {
  const m = /(\d+)/.exec(raw.trim());
  return m ? Number(m[1]) : undefined;
}

/** Lowest version a range admits — enough to tell `>=11` from a pinned pnpm 12. */
export function minor(raw: string): [number, number, number] | undefined {
  const m = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(raw.trim());
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : undefined;
}

export function satisfiesMin(version: string, range: string): boolean {
  const [a, b, c] = minor(version) ?? [0, 0, 0];
  const [x, y, z] = minor(range) ?? [0, 0, 0];
  return a !== x ? a > x : b !== y ? b > y : c >= z;
}

/** `FROM node:24-alpine`, `FROM node:24.20.0-slim AS build`. */
export function dockerNode(source: string): string | undefined {
  return /^\s*FROM\s+(?:--\S+\s+)*node:([^\s]+)/im.exec(source)?.[1];
}

function read(rel: string): string | undefined {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return undefined;
  }
}

function dockerfiles(): string[] {
  try {
    return execFileSync('git', ['ls-files', '*Dockerfile*'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collect(): { nodes: Declaration[]; problems: string[] } {
  const nodes: Declaration[] = [];
  const problems: string[] = [];

  const add = (source: string, raw: string | undefined) => {
    if (!raw) return;
    const m = major(raw);
    if (m !== undefined) nodes.push({ source, raw: raw.trim(), major: m });
  };

  add('.nvmrc', read('.nvmrc'));
  add('.node-version', read('.node-version'));

  const pkgRaw = read('package.json');
  const pkg = pkgRaw ? JSON.parse(pkgRaw) : {};
  add('package.json engines.node', pkg.engines?.node);
  for (const file of dockerfiles()) add(file, dockerNode(read(file) ?? ''));

  // engines.pnpm is a floor; packageManager is the pin the repo actually runs.
  const pinned = /pnpm@(\S+)/.exec(pkg.packageManager ?? '')?.[1];
  const floor = pkg.engines?.pnpm;
  if (pinned && floor && !satisfiesMin(pinned, floor))
    problems.push(`pnpm: packageManager pins ${pinned} but engines.pnpm requires ${floor}`);

  return { nodes, problems };
}

if (process.argv[2] === '--selftest') {
  const assert = await import('node:assert/strict');
  assert.equal(major('24.20.0'), 24);
  assert.equal(major('>=24.0.0'), 24);
  assert.equal(major('24-alpine\n'), 24);
  assert.equal(major('lts/*'), undefined);
  assert.equal(dockerNode('FROM node:24-alpine\nRUN x'), '24-alpine');
  assert.equal(dockerNode('FROM --platform=amd64 node:22.1.0-slim AS build'), '22.1.0-slim');
  assert.equal(dockerNode('FROM postgres:17'), undefined);
  assert.ok(satisfiesMin('12.3.4', '>=11.0.0'));
  assert.ok(satisfiesMin('11.0.0', '>=11.0.0'));
  assert.ok(!satisfiesMin('10.9.0', '>=11.0.0'));
  assert.ok(!satisfiesMin('11.0.0', '>=11.0.1'));
  console.log('ok');
  process.exit(0);
}

const { nodes, problems } = collect();

const majors = [...new Set(nodes.map(n => n.major))];
if (majors.length > 1)
  problems.push(
    'Node major disagrees across:\n' + nodes.map(n => `    ${n.source}: ${n.raw}`).join('\n')
  );

// .nvmrc and .node-version are both exact pins for the same tool — majors are not enough.
const nvmrc = nodes.find(n => n.source === '.nvmrc');
const nodeVersion = nodes.find(n => n.source === '.node-version');
if (nvmrc && nodeVersion && nvmrc.raw !== nodeVersion.raw)
  problems.push(`.nvmrc is ${nvmrc.raw} but .node-version is ${nodeVersion.raw}`);

if (!problems.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    systemMessage:
      'Toolchain version drift:\n' +
      problems.map(p => `  - ${p}`).join('\n') +
      '\n  Pick one version and update every file above.',
  })
);
