# Edit This Page Link

Adds an "Edit this page" link to every docs page pointing to the source file on GitHub.

## What changed

- `src/components/edit-this-page.tsx` — new component; builds the GitHub blob URL from the
  contentlayer `flattenedPath` (e.g. `cli/overview` → `…/docs/cli/overview.mdx`).
- `src/app/docs/[...slug]/page.tsx` — imports the component and renders it below the MDX
  content, separated by a thin border.

## URL pattern

```
https://github.com/nextellarlabs/nextellar-docs/blob/main/docs/<flattenedPath>.mdx
```

## Acceptance

- `pnpm build:content` passes — no new MDX files added.
- `pnpm check:links` passes — the edit link is an external `<a>` tag, not an internal route.
