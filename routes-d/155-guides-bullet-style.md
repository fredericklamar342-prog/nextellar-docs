# Issue #155 — Normalize bullet list style across the guides section

Working draft / decision record. Lives outside `docs/` so it does not affect the
Contentlayer build. Scope is documentation only, as the issue requires.

## Chosen convention

**Hyphen (`-`) as the unordered-list marker** across the guides section.

Rationale:

- It is the marker already used by every existing list in the guides section.
- It is the most common convention in the rest of the repo and in the
  Prettier/Markdown ecosystem default.
- GitHub-flavored task lists (`- [ ]`) build on the same hyphen marker, so a
  single rule covers both plain bullets and checklists.

## Audit result

Scope = the guides section, i.e. `docs/guides/`:

| File                         | Unordered-list markers found                  | Action           |
| ---------------------------- | --------------------------------------------- | ---------------- |
| `docs/guides/index.mdx`      | `-` only (4 bullets)                          | No change needed |
| `docs/guides/deployment.mdx` | `-` only (plain bullets + `- [ ]` checklists) | No change needed |

No `*` or `+` bullet markers exist anywhere in the guides section, at any nesting
level, so the section is already consistent with the chosen convention. Nesting
and indentation are unchanged.

## Acceptance criteria

- `pnpm build:content` — unaffected (no content edits in this section).
- `pnpm check:links` — unaffected.
- Per-issue constraint to keep changes documentation-only is satisfied: this
  issue produced no `docs/` change because the section already conforms; the
  convention is recorded here for future guide pages to follow.
