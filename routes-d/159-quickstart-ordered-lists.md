# Issue #159 — Fix ordered list numbering on the quick-start page

Working draft / decision record. Lives outside `docs/` so it does not affect the
Contentlayer build. Scope is documentation only.

## Convention

Ordered lists use **explicit sequential numbering** (`1.`, `2.`, `3.`, …) with
no gaps or restarts, and each list's items are contiguous (not interrupted by
un-indented content that would reset the rendered count).

## Audit result

Scope = the quick-start page, `docs/getting-started/quick-start.mdx`. It contains
exactly two ordered lists:

| Location (Step)           | Source numbering | Rendered | Action           |
| ------------------------- | ---------------- | -------- | ---------------- |
| Step 2 — Connect a Wallet | `1. 2. 3. 4.`    | 1–4      | No change needed |
| Step 4 — Test Your App    | `1. 2. 3. 4. 5.` | 1–5      | No change needed |

Both lists are already contiguous and correctly sequenced; the surrounding
`## Step N:` headings are likewise sequential (Step 1 → Step 5). No broken,
duplicated, or restarted numbering was found, so no `docs/` change is required.
Step content is unchanged.

## Acceptance criteria

- `pnpm build:content` — unaffected.
- `pnpm check:links` — unaffected.
- The page already satisfies the requirement; the convention is recorded here.
