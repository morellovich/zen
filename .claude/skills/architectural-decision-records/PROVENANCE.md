# Provenance

Vendored verbatim from [intent-driven-dev/skills](https://github.com/intent-driven-dev/skills)
(`.agents/skills/architectural-decision-records`), MIT licensed, upstream commit `15aa67841421`, copied 2026-09-09.
SKILL.md and references/ are unmodified — do not hand-edit them; re-copy from
upstream instead.

## Zen-specific caveats

Supports the superspec `adr` artifact (v5). Use it when drafting or reviewing an
ADR. Two zen-specific deviations from the skill's own defaults:

- ADR files go in `docs/adr/NNNN-kebab-title.md` at the repository root, never
  under `openspec/` — `/opsx:archive` would bury them.
- The schema mandates MADR-short (Context / Decision / Consequences) plus
  `Status:`, `Date:` and optional `Supersedes:`. The skill's `templates/` offer
  MADR-full, Nygard and Y-statement as alternatives; the schema's `adr`
  instruction wins on format.

Accepted ADRs are immutable — see the IRON RULE in the schema's adr artifact.
