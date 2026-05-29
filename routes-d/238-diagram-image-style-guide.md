# Issue #238 — Design a consistent diagram and image style guide

Working draft for the docs change requested in issue #238.

## Planned doc location

- `docs/guides/diagram-image-style.mdx`

## Example assets

- `public/images/style-guide/flowchart-example.svg`
- `public/images/style-guide/labeled-frame-example.svg`
- `public/images/style-guide/color-palette.svg`

## Scope

- Define colors aligned with `src/app/globals.css` and `src/components/Mermaid.tsx`
- Document sizing for diagrams, screenshots, and inline images
- Document labeling, captions, and alt text
- Provide export settings for SVG, PNG, and Mermaid
- Link to [Screenshot Workflow](/docs/guides/screenshot-workflow) and theme guide

## Validation

- `pnpm build:content`
- `pnpm check:links`
- `pnpm validate:sidebar` (after sidebar entry)
