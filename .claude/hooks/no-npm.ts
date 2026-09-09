#!/usr/bin/env node
/** PreToolUse(Bash): deny npm/npx, point the agent at the pnpm equivalent. */

interface HookInput {
  tool_input?: { command?: string };
}

// npm/npx only in command-word position, so `pnpm` and `grep npm ...` don't trip it.
const CMD =
  /(?:^|[;&|(]|&&|\|\||\n)\s*(?:sudo\s+|env\s+\S+=\S+\s+)*(npm|npx)\b([^;&|)\n]*)/;

const CHEAT = [
  "install -> pnpm install",
  "ci -> pnpm install --frozen-lockfile",
  "run X -> pnpm X",
  "exec -> pnpm exec",
  "npx X -> pnpm dlx X",
].join(" | ");

function suggest(tool: string, rest: string): string {
  const args = rest.trim();
  if (tool === "npx") return `pnpm dlx ${args}`.trim();

  const [verb, ...tailParts] = args.split(/\s+/);
  const tail = tailParts.join(" ");
  switch (verb) {
    case "install":
    case "i":
      return "pnpm install" + (tail ? `  (or \`pnpm add ${tail}\`)` : "");
    case "ci":
      return "pnpm install --frozen-lockfile";
    case "run":
      return `pnpm ${tail}`.trim();
    case "exec":
      return `pnpm dlx ${tail}`.trim();
    default:
      return `pnpm ${args}`.trim();
  }
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

const input: HookInput = JSON.parse(Buffer.concat(chunks).toString() || "{}");
const match = CMD.exec(input.tool_input?.command ?? "");

if (match) {
  const [, tool, rest] = match;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          `BLOCKED: \`${tool}\` is not allowed in this repo — it uses pnpm.\n` +
          `Use instead: ${suggest(tool, rest)}\n` +
          `Cheat sheet: ${CHEAT}`,
      },
    }),
  );
}
