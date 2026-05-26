# Issue #221 — Accessibility audit (docs content)

Working draft documenting the audit findings. Lives outside `docs/` so it does
not affect the Contentlayer build. Scope is limited to documentation content, as
required by the issue.

## Method

Static scan of every `*.mdx` / `*.md` file under `docs/` for:

- heading hierarchy (missing/duplicate `h1`, skipped levels)
- image alternative text (`![]()` and `<img>` without `alt`)
- non-descriptive link text ("click here", "read more", etc.)

## Findings

| Area      | Finding                                                                                                                                         | Action                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Headings  | `docs/customization/toc.mdx` skipped from an `h2` ("Where is the TOC Rendered?") straight to an `h4` ("TOC Component").                         | **Fixed** — promoted the `h4` to `h3` so the outline is sequential. |
| Alt text  | Only one content image exists (`docs/search-bar.mdx`), and it already has descriptive alt text ("Search Bar Demo").                             | No change needed.                                                   |
| Link text | No non-descriptive link text found in docs.                                                                                                     | No change needed.                                                   |
| Contrast  | Color contrast is governed by the theme/CSS (`src/app/globals.css`), not documentation content, so it is out of scope for this docs-only issue. | Tracked separately.                                                 |

## Result

The highest-impact, in-scope issue (the heading-level skip) is fixed in
`docs/customization/toc.mdx`. Remaining content was already conformant.
