# Issue #168 — Unify date formats in frontmatter across docs

Working draft / decision record. Lives outside `docs/` so it does not affect the
Contentlayer build.

## Chosen format

**ISO 8601 calendar date — `YYYY-MM-DD`** (unquoted), e.g. `date: 2025-03-12`.

Rationale:

- It is the format Contentlayer's `date` field parses natively
  (`contentlayer.config.ts` declares `date: { type: 'date' }`).
- It is unambiguous and sorts lexicographically.
- It already matches the majority convention in the repo.

## Audit result

All 25 pages that currently declare a `date:` in frontmatter already use the
`YYYY-MM-DD` format — there are no `MM/DD/YYYY`, month-name, or quoted variants
remaining. The acceptance criteria (parses without errors, builds via
`pnpm build:content`) are therefore already satisfied on `main`.

Files without a `date:` field were left untouched: dates are optional in the
schema and inventing values would violate the "keep values accurate" constraint.
