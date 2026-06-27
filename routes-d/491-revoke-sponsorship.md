---
title: Revoke Sponsorship Operation
description: How to remove or transfer reserve sponsorship for ledger entries and signers using the RevokeSponsorship operation, with result codes and a small JS example
---

# Revoke Sponsorship Operation

The `RevokeSponsorship` operation removes or transfers an existing reserve sponsorship on a ledger entry or signer. Sponsorship lets one account (the sponsor) pay the base-reserve cost for another account's subentries; revoking that sponsorship shifts the reserve obligation back to the entry owner — or to a new sponsor when used inside a begin/end sponsoring sandwich.

---

## Operation Variants

`RevokeSponsorship` has two variants depending on what is being de-sponsored:

| Variant | Identifies target by | SDK helper |
|---------|----------------------|------------|
| Ledger entry | Ledger key (account, trustline, offer, data entry, claimable balance, liquidity pool) | `Operation.revokeAccountSponsorship`, `Operation.revokeTrustlineSponsorship`, `Operation.revokeOfferSponsorship`, `Operation.revokeDataSponsorship`, `Operation.revokeClaimableBalanceSponsorship`, `Operation.revokeLiquidityPoolSponsorship` |
| Signer | Account ID + signer key | `Operation.revokeSignerSponsorship` |

---

## Reserve Transition Rules

When sponsorship is revoked the reserve moves as follows:

- **Simple revoke** — the entry's owner account absorbs the reserve obligation. If the owner does not hold enough XLM to cover it, the operation fails with `REVOKE_SPONSORSHIP_LOW_RESERVE`.
- **Sponsorship transfer** — wrap the revoke inside `beginSponsoringFutureReserves` / `endSponsoringFutureReserves` in the same transaction. The reserve obligation moves to the new sponsor instead of the owner.

### Result Codes

| Code | Meaning |
|------|---------|
| `REVOKE_SPONSORSHIP_SUCCESS` | Sponsorship removed or transferred |
| `REVOKE_SPONSORSHIP_LOW_RESERVE` | Owner cannot meet the reserve after revocation |
| `REVOKE_SPONSORSHIP_NOT_SPONSOR` | Source account is not the current sponsor of the entry |
| `REVOKE_SPONSORSHIP_ONLY_TRANSFERABLE` | The entry can only be transferred to a new sponsor, not simply removed |
| `REVOKE_SPONSORSHIP_DOES_NOT_EXIST` | No sponsorship record exists for the target |

---

## Simple Revoke Example

Revoke the sponsorship on a trustline. The trustline owner must then hold the 0.5 XLM base reserve themselves.

```js
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const sponsorKeypair = Keypair.fromSecret("S...");  // current sponsor

async function revokeTrustline(ownerPublicKey, asset) {
  const account = await server.loadAccount(sponsorKeypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.revokeTrustlineSponsorship({
        account: ownerPublicKey,   // trustline owner
        asset,                     // Asset or LiquidityPoolId
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(sponsorKeypair);
  const result = await server.submitTransaction(tx);
  console.log("Sponsorship revoked. Tx hash:", result.hash);
}

await revokeTrustline(
  "GAAZI4TCR3TIE2CAQMKUXFKD7GQOQHFLHPQNFR6V3RDWKDPFA6DSBFA",
  new Asset("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN")
);
```

---

## Sponsorship Transfer Pattern

To move the reserve obligation to a new sponsor rather than dropping it onto the owner, wrap the revoke inside a `beginSponsoringFutureReserves` / `endSponsoringFutureReserves` pair in the same transaction. The transaction must be signed by both the new sponsor and the entry owner.

```js
async function transferTrustlineSponsorship(
  newSponsorKeypair,
  ownerKeypair,
  asset
) {
  const account = await server.loadAccount(newSponsorKeypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "300",
    networkPassphrase: Networks.TESTNET,
  })
    // 1. New sponsor volunteers to cover future reserves for the owner
    .addOperation(
      Operation.beginSponsoringFutureReserves({
        sponsoredId: ownerKeypair.publicKey(),
      })
    )
    // 2. Revoke old sponsorship — reserve now belongs to the new sponsor
    .addOperation(
      Operation.revokeTrustlineSponsorship({
        account: ownerKeypair.publicKey(),
        asset,
        source: newSponsorKeypair.publicKey(), // optional: explicit source
      })
    )
    // 3. Owner closes the sponsoring window (sourced from the owner account)
    .addOperation(
      Operation.endSponsoringFutureReserves({
        source: ownerKeypair.publicKey(),
      })
    )
    .setTimeout(30)
    .build();

  // Both parties must sign
  tx.sign(newSponsorKeypair);
  tx.sign(ownerKeypair);

  const result = await server.submitTransaction(tx);
  console.log("Sponsorship transferred. Tx hash:", result.hash);
}
```

---

## Revoking a Signer Sponsorship

Use `Operation.revokeSignerSponsorship` to remove sponsorship from a signer rather than a ledger entry:

```js
Operation.revokeSignerSponsorship({
  account: ownerPublicKey,         // account the signer belongs to
  signer: {
    ed25519PublicKey: signerPublicKey, // the signer key being de-sponsored
  },
})
```

**Related:** sponsorship, base reserve, subentry, `beginSponsoringFutureReserves`, `endSponsoringFutureReserves`, trustline

**Related docs:** [Horizon Integration](/docs/integrations/horizon), [Glossary](/docs/guides/glossary)

**Deeper reading:** [Sponsored Reserves](https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/sponsored-reserves)
