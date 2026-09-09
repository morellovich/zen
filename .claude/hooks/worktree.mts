#!/usr/bin/env node
/**
 * Re-root a hook at the git worktree the edited file lives in.
 *
 * Superspec's apply phase — the one phase that writes new implementation code —
 * implements inside `.worktrees/<change-name>/` (superpowers 6.x keeps worktrees in the
 * project rather than under ~/.config). Paths there sit below CLAUDE_PROJECT_DIR, so
 * every root-anchored assumption in these hooks quietly stops matching: tdd-guard's
 * `SRC` pattern, the colocated `.spec.ts` lookup, `project.json` discovery.
 * The hooks don't fail, they no-op — the worst failure mode for a guard.
 *
 * Re-rooting points them at the worktree's own specs, project.json and git history.
 */

import { join, relative } from 'node:path';

/** `<root>/.worktrees/x/libs/a.ts` -> `<root>/.worktrees/x`. Not in one -> `root`. */
export function reroot(root: string, abs: string): string {
  const [prefix] = /^\.?worktrees\/[^/]+/.exec(relative(root, abs)) ?? [];
  return prefix ? join(root, prefix) : root;
}

// `import.meta.main` is load-bearing, not decoration: ESM evaluates an import before the
// body of the module importing it, so without it `node <any-hook>.mts --selftest` ran THIS
// block and exited 0 — every importing hook reported a green selftest it never executed.
if (import.meta.main && process.argv[2] === '--selftest') {
  const assert = await import('node:assert/strict');

  assert.equal(reroot('/r', '/r/libs/auth/src/lib/auth.service.ts'), '/r'); // main checkout
  assert.equal(
    reroot('/r', '/r/.worktrees/feat-x/libs/auth/src/lib/auth.service.ts'),
    '/r/.worktrees/feat-x'
  );
  assert.equal(reroot('/r', '/r/worktrees/feat-x/apps/api/src/main.ts'), '/r/worktrees/feat-x'); // undotted
  assert.equal(reroot('/r', '/r/.worktrees/feat-x'), '/r/.worktrees/feat-x'); // the worktree root itself
  assert.equal(reroot('/r', '/r/.worktrees'), '/r'); // the container is not a worktree
  assert.equal(reroot('/r', '/r/libs/worktrees/src/a.ts'), '/r'); // only a leading segment counts
  assert.equal(reroot('/r', '/elsewhere/a.ts'), '/r'); // outside; the caller's `..` check rejects it
  console.log('ok');
  process.exit(0);
}
