# Issue #160 — Standardize spelling of common product terms

Working draft / decision record. Lives outside `docs/` so it does not affect the
Contentlayer build. Scope is documentation only.

## Canonical glossary

| Term      | Canonical spelling in prose | Notes                                      |
| --------- | --------------------------- | ------------------------------------------ |
| Stellar   | `Stellar`                   | Proper noun.                               |
| Soroban   | `Soroban`                   | Proper noun (the smart-contract platform). |
| Nextellar | `Nextellar`                 | Product name.                              |
| Freighter | `Freighter`                 | Product name.                              |
| Horizon   | `Horizon`                   | Proper noun (the API).                     |
| XLM       | `XLM`                       | Asset code, uppercase.                     |
| Friendbot | `Friendbot`                 | Proper noun.                               |
| dApp      | `dApp`                      | Lowercase `d`, capital `A`.                |
| testnet   | `testnet`                   | Lowercase in running prose.                |
| mainnet   | `mainnet`                   | Lowercase in running prose.                |

### Code / identifier exception

Lowercase forms are **correct and must be preserved** when the token is code, a
command, an identifier, a package name, or a URL — they are not prose:

- the CLI binary `nextellar` (e.g. `nextellar my-app`)
- the `soroban` CLI / package names (`soroban-cli`, `@stellar/...`)
- string values and flags (`'freighter'`, `-w freighter,albedo`)
- example project names (e.g. `nextellar my-dapp-2024`)

Structured network-listing tables and rendered UI button labels that use Title
Case consistently (e.g. the wallet support table's `Mainnet, Testnet` column,
the "Fund with Friendbot" button) are left as-is — Title Case is internally
consistent there and is a label, not running prose.

## Audit result

A repo-wide scan of `docs/` for each term and its variants found that product
proper-nouns are already consistent in prose:

- `stellar`, `soroban` as **prose** words: **0** wrongly-lowercased occurrences
  (all lowercase hits are code/commands/identifiers/URLs).
- `freighter` as a prose word: **0** (the lowercase hits are string values and a
  CLI flag).
- `dapp`: a single occurrence, and it is the example project name
  `nextellar my-dapp-2024` (a literal arg), so it is left unchanged.

The only genuine prose inconsistency was the casing of the network terms
`testnet` / `mainnet`, which were mixed even **within the same list**:

| File                         | Before                                                                                                       | After                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `docs/guides/deployment.mdx` | `Switch to Mainnet Horizon URL` (while the same checklist three lines down already read "…on testnet first") | `Switch to mainnet Horizon URL` |
| `docs/cli/commands.mdx`      | `Testnet configuration` (prose feature bullet)                                                               | `testnet configuration`         |

Both edits make the surrounding prose internally consistent with the lowercase
convention the docs already use most often.

## Acceptance criteria

- `pnpm build:content` — passes (prose-only text edits, no frontmatter/structure change).
- `pnpm check:links` — unaffected (no links touched).
- Changes are scoped to documentation content only.
