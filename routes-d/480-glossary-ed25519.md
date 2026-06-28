---
title: "Glossary: ed25519"
description: Short definition of the ed25519 signature scheme and its role in Stellar account identity and transaction authorization
---

# Glossary: ed25519

An elliptic-curve digital signature scheme (EdDSA over Curve25519) used throughout the Stellar network to prove account ownership and authorize transactions. It produces deterministic, compact signatures without requiring a random nonce at signing time.

---

## Key Properties

| Property | Value |
|----------|-------|
| Algorithm | EdDSA over Curve25519 |
| Public key size | 32 bytes |
| Signature size | 64 bytes |
| Deterministic | Yes — same message + key always produces the same signature |
| Security level | ~128-bit equivalent |

---

## Role in Stellar Accounts

Every Stellar account is identified by an ed25519 public key. The familiar "G..." address is that 32-byte key encoded with a 1-byte version prefix, a 2-byte CRC-16 checksum, and base32 (the StrKey format). The corresponding "S..." secret key encodes the 32-byte ed25519 seed from which the public key is derived.

Submitting a transaction requires a valid ed25519 signature from one or more of the account's declared signers. The network checks each signature against the account's signer list and the operation's required weight threshold before accepting the transaction.

ed25519 also appears in:
- **SEP-10 Web Auth** — the client proves account ownership by signing a challenge with its ed25519 key.
- **Soroban contract auth** — contract invocations attach ed25519-signed authorization entries.

---

## StrKey Encoding

```js
import { Keypair } from "@stellar/stellar-sdk";

// Generate a new ed25519 keypair
const keypair = Keypair.random();
console.log(keypair.publicKey()); // G... (56-char base32 StrKey)
console.log(keypair.secret());    // S... (56-char base32 StrKey)

// Sign and verify a message
const message = Buffer.from("hello stellar", "utf8");
const signature = keypair.sign(message);          // 64-byte Uint8Array
const valid = keypair.verify(message, signature); // true
```

---

## Notes

- The ed25519 seed (the "S..." secret) must stay private. Exposing it grants full signing authority over the account.
- Multi-signature accounts can hold up to 20 signers, each referenced by its ed25519 public key (or by a pre-auth hash or hash(x) signer type).
- ed25519 is distinct from secp256k1; Stellar does not use secp256k1 for its native account keys.

**Related:** StrKey, account, signer, multi-signature, SEP-10, transaction envelope

**Related docs:** [Horizon Integration](/docs/integrations/horizon), [Glossary](/docs/guides/glossary)

**Deeper reading:** [Signatures and Multi-sig](https://developers.stellar.org/docs/learn/encyclopedia/security/signatures-multisig) · [ed25519.cr.yp.to](https://ed25519.cr.yp.to/)
