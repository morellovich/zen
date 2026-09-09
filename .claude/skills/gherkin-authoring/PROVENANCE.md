# Provenance

Vendored verbatim from [intent-driven-dev/skills](https://github.com/intent-driven-dev/skills)
(`.agents/skills/gherkin-authoring`), MIT licensed, upstream commit `15aa67841421`, copied 2026-09-09.
SKILL.md and references/ are unmodified — do not hand-edit them; re-copy from
upstream instead.

## Zen-specific caveats

Active. The superspec `specs` artifact invokes this skill when drafting delta
specs. Scope note: in this repo, Gherkin lives as bold-bullet
`- **GIVEN** / **WHEN** / **THEN**` steps inside
`openspec/changes/<change>/specs/<capability>/spec.md`, not in `.feature`
files. Preserve the Markdown wrapper (this skill already requires that) and do
not convert bullets into column-0 ```gherkin fences.
