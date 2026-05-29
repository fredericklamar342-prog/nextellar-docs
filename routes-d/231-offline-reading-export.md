# Issue #231 — Document a full offline reading export workflow

Working draft for the docs change requested in issue #231.

## Planned doc location

- `docs/guides/offline-reading.mdx`

## Scope

- Describe mirroring the production build from a local server
- Document prerequisites and step-by-step commands
- Note limitations (Mermaid client render, search, external links)
- Cross-link contributing and deployment guides

## Validation

- `pnpm build:content`
- `pnpm check:links`
- Workflow steps verified against `pnpm build` + `pnpm start`
