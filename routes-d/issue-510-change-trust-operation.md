---
title: The change_trust Operation
description: Thorough documentation of the change_trust operation in Stellar, covering all parameter combinations, removal flow, and examples
---

# The change_trust Operation

The `change_trust` operation creates, modifies, or deletes a **trustline** — an account's authorization to hold a specific asset issued by another account. Trustlines are fundamental to Stellar's asset model, enabling the issuance and transfer of custom assets beyond native XLM.

---

## Overview

### What is a Trustline?

A trustline represents:

- **Authorization**: Your account's permission to hold a specific asset
- **Limit**: Maximum balance you're willing to hold
- **Issuer**: The account that issued the asset
- **Asset Code**: The unique identifier for the asset

Without a trustline, an account cannot receive or hold custom assets. XLM (native asset) does not require a trustline.

### When to Use change_trust

- **Create Trustline**: Before receiving a custom asset for the first time
- **Modify Limit**: Increase or decrease the maximum balance you'll hold
- **Delete Trustline**: Remove authorization to hold an asset (after balance is zero)

---

## Operation Parameters

The `change_trust` operation accepts the following parameters:

```typescript
Operation.changeTrust({
  asset: Asset;
  limit?: string;
  source?: string;
})
```

### asset (required)

The asset to establish trust for. Can be:

- **Custom Asset**: `Asset(code: string, issuer: string)`
- **Native Asset**: `Asset.native()` (rarely used for trustlines)

```typescript
// Custom asset
const usdcAsset = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
);

// Native asset (XLM) - rarely used
const xlmAsset = Asset.native();
```

### limit (optional)

The maximum balance of this asset the account is willing to hold. Defaults to maximum possible value if omitted.

**Format**: String representing the maximum amount (up to 18 decimal places)

```typescript
// Set a specific limit
Operation.changeTrust({
  asset: usdcAsset,
  limit: '1000000', // Maximum 1,000,000 USDC
});

// No limit (maximum possible value)
Operation.changeTrust({
  asset: usdcAsset,
  // limit omitted = unlimited
});
```

**Limit Constraints:**

- Must be a non-negative number
- Cannot exceed the maximum representable value (9223372036854775807)
- Cannot be lower than current balance when reducing
- Must be at least the current balance when modifying

### source (optional)

The source account funding the operation. If omitted, uses the transaction's source account.

```typescript
Operation.changeTrust({
  asset: usdcAsset,
  limit: '1000',
  source: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
});
```

---

## Parameter Combinations

### 1. Create Trustline with Limit

Most common pattern — establish trust with a maximum balance:

```typescript
import {
  TransactionBuilder,
  Asset,
  Operation,
  Networks,
  Keypair,
} from '@stellar/stellar-sdk';

async function createTrustline(
  secretKey: string,
  assetCode: string,
  assetIssuer: string,
  limit: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const asset = new Asset(assetCode, assetIssuer);

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: asset,
        limit: limit,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}

// Example: Trust USDC up to 10,000
await createTrustline(
  'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  '10000'
);
```

### 2. Create Trustline with No Limit

Allow unlimited balance of the asset:

```typescript
.addOperation(
  Operation.changeTrust({
    asset: new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),
    // limit omitted = maximum possible value
  })
)
```

**Use case**: When you fully trust the issuer and don't want to restrict holdings.

### 3. Modify Trustline Limit

Increase or decrease the maximum balance:

```typescript
async function modifyTrustlineLimit(
  secretKey: string,
  assetCode: string,
  assetIssuer: string,
  newLimit: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const asset = new Asset(assetCode, assetIssuer);

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: asset,
        limit: newLimit,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}

// Increase limit from 10,000 to 100,000
await modifyTrustlineLimit(
  'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  '100000'
);
```

**Important**: You cannot reduce the limit below your current balance.

### 4. Delete Trustline (Removal Flow)

Remove authorization to hold an asset. This requires:

1. Balance must be zero
2. No open offers involving the asset
3. Sufficient XLM for transaction fees

```typescript
async function deleteTrustline(
  secretKey: string,
  assetCode: string,
  assetIssuer: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const asset = new Asset(assetCode, assetIssuer);

  // Check current balance
  const balances = account.balances;
  const assetBalance = balances.find(
    (b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer
  );

  if (assetBalance && parseFloat(assetBalance.balance) > 0) {
    throw new Error('Cannot delete trustline with non-zero balance');
  }

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: asset,
        limit: '0', // Setting limit to 0 deletes the trustline
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}

// Delete USDC trustline
await deleteTrustline(
  'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
);
```

### 5. Batch Trustline Creation

Create multiple trustlines in a single transaction:

```typescript
async function createMultipleTrustlines(
  secretKey: string,
  assets: Array<{ code: string; issuer: string; limit: string }>
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const transaction = new TransactionBuilder(account, {
    fee: '100', // Fee per operation
    networkPassphrase: Networks.TESTNET,
  });

  assets.forEach(({ code, issuer, limit }) => {
    transaction.addOperation(
      Operation.changeTrust({
        asset: new Asset(code, issuer),
        limit: limit,
      })
    );
  });

  transaction.setTimeout(30).build();
  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}

// Create trustlines for multiple assets
await createMultipleTrustlines(
  'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  [
    {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      limit: '10000',
    },
    {
      code: 'EURT',
      issuer: 'GAP5LETOV6YIE62YAM56STDANPRVO7A3PK3NQ4BCTA3D5ABAKEV51',
      limit: '5000',
    },
    {
      code: 'JPYT',
      issuer: 'GDNAKJIQJ64Z7ERWV7WEJ7LXKCGNF7R5EEB2JB7C7A5RYJGCJXPMQWV7',
      limit: '100000',
    },
  ]
);
```

---

## Removal Flow in Detail

Deleting a trustline requires careful preparation:

### Step 1: Check Current Balance

```typescript
async function getAssetBalance(
  publicKey: string,
  assetCode: string,
  assetIssuer: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const account = await server.loadAccount(publicKey);

  const balance = account.balances.find(
    (b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer
  );

  return balance ? parseFloat(balance.balance) : 0;
}

const balance = await getAssetBalance(
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
);

if (balance > 0) {
  console.log(`Must send ${balance} USDC elsewhere before deleting trustline`);
}
```

### Step 2: Sell or Transfer Asset

Send the asset to another account or back to the issuer:

```typescript
async function sendAsset(
  secretKey: string,
  assetCode: string,
  assetIssuer: string,
  amount: string,
  destination: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const asset = new Asset(assetCode, assetIssuer);

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: destination,
        asset: asset,
        amount: amount,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}
```

### Step 3: Cancel Open Offers

Check for and cancel any offers involving the asset:

```typescript
async function cancelAssetOffers(
  secretKey: string,
  assetCode: string,
  assetIssuer: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const offers = await server.offers().forAccount(keypair.publicKey()).call();

  const assetOffers = offers.records.filter((offer: any) => {
    return (
      offer.selling.asset_code === assetCode ||
      offer.buying.asset_code === assetCode
    );
  });

  if (assetOffers.length === 0) {
    console.log('No open offers to cancel');
    return;
  }

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  });

  assetOffers.forEach((offer: any) => {
    transaction.addOperation(
      Operation.manageSellOffer({
        selling: new Asset(
          offer.selling.asset_code,
          offer.selling.asset_issuer
        ),
        buying: new Asset(offer.buying.asset_code, offer.buying.asset_issuer),
        amount: '0',
        price: { n: 1, d: 1 },
        offerId: offer.id,
      })
    );
  });

  transaction.setTimeout(30).build();
  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}
```

### Step 4: Delete Trustline

Once balance is zero and offers are cancelled:

```typescript
await deleteTrustline(secretKey, assetCode, assetIssuer);
```

---

## Common Error Scenarios

### Error: op_no_trust

**Cause**: Trustline doesn't exist when trying to receive asset

**Solution**: Create trustline first

```typescript
try {
  await sendPayment(asset, amount);
} catch (error) {
  if (error.extras?.result_codes?.operations?.[0] === 'op_no_trust') {
    console.log('Trustline not found, creating...');
    await createTrustline(secretKey, asset.code, asset.issuer, '1000');
    // Retry payment
  }
}
```

### Error: op_no_issuer

**Cause**: Issuer account doesn't exist

**Solution**: Verify issuer account is funded and active

```typescript
async function verifyIssuer(issuer: string) {
  const server = new Server('https://horizon-testnet.stellar.org');
  try {
    await server.loadAccount(issuer);
    return true;
  } catch (error) {
    return false;
  }
}
```

### Error: op_limit_overflow

**Cause**: Limit exceeds maximum representable value

**Solution**: Use a smaller limit or omit for maximum

```typescript
// Wrong
limit: '9223372036854775808'; // Too large

// Correct
limit: '9223372036854775807'; // Maximum
// or omit for automatic maximum
```

### Error: op_line_full

**Cause**: Trying to receive more than trustline limit

**Solution**: Increase limit or reduce amount

```typescript
try {
  await sendPayment(asset, amount);
} catch (error) {
  if (error.extras?.result_codes?.operations?.[0] === 'op_line_full') {
    console.log('Trustline limit reached, increasing...');
    await modifyTrustlineLimit(secretKey, asset.code, asset.issuer, '100000');
  }
}
```

### Error: op_underfunded

**Cause**: Insufficient XLM to pay trustline reserve (0.5 XLM per trustline)

**Solution**: Ensure account has at least 2 XLM (1 base + 0.5 per trustline)

```typescript
async function checkMinimumBalance(publicKey: string) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const account = await server.loadAccount(publicKey);
  const balance = parseFloat(account.balances[0].balance);
  const trustlines = account.balances.length - 1; // Exclude XLM
  const minimum = 1 + 0.5 * trustlines;

  return balance >= minimum;
}
```

---

## Best Practices

### 1. Check Existing Trustlines Before Creating

```typescript
async function hasTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const account = await server.loadAccount(publicKey);

  return account.balances.some(
    (b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer
  );
}

if (!(await hasTrustline(publicKey, 'USDC', issuer))) {
  await createTrustline(secretKey, 'USDC', issuer, '10000');
}
```

### 2. Use Conservative Limits

Set reasonable limits to manage risk:

```typescript
// Conservative approach
const conservativeLimit = '1000'; // Small amount for testing

// Production approach
const productionLimit = '100000'; // Based on expected usage
```

### 3. Monitor Trustline Usage

Track balance vs limit:

```typescript
function getTrustlineUtilization(balance: string, limit: string): number {
  return (parseFloat(balance) / parseFloat(limit)) * 100;
}

const utilization = getTrustlineUtilization('500', '1000'); // 50%
```

### 4. Clean Up Unused Trustlines

Remove trustlines for assets you no longer use to free up reserve:

```typescript
async function cleanupUnusedTrustlines(secretKey: string) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const zeroBalanceAssets = account.balances.filter(
    (b: any) => b.asset_type !== 'native' && parseFloat(b.balance) === 0
  );

  for (const asset of zeroBalanceAssets) {
    await deleteTrustline(secretKey, asset.asset_code, asset.asset_issuer);
  }
}
```

### 5. Validate Asset Details

Verify asset code and issuer before creating trustline:

```typescript
function isValidAssetCode(code: string): boolean {
  return /^[A-Z0-9]{1,12}$/.test(code);
}

function isValidIssuer(issuer: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(issuer);
}

if (!isValidAssetCode(assetCode) || !isValidIssuer(assetIssuer)) {
  throw new Error('Invalid asset code or issuer');
}
```

---

## Complete Example: Trustline Management UI

```tsx
import { useState } from 'react';
import {
  Asset,
  Keypair,
  Server,
  TransactionBuilder,
  Operation,
  Networks,
} from '@stellar/stellar-sdk';

export function TrustlineManager({ secretKey }: { secretKey: string }) {
  const [assetCode, setAssetCode] = useState('');
  const [assetIssuer, setAssetIssuer] = useState('');
  const [limit, setLimit] = useState('');
  const [action, setAction] = useState<'create' | 'modify' | 'delete'>(
    'create'
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const server = new Server('https://horizon-testnet.stellar.org');
      const keypair = Keypair.fromSecret(secretKey);
      const account = await server.loadAccount(keypair.publicKey());
      const asset = new Asset(assetCode, assetIssuer);

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset,
            limit: action === 'delete' ? '0' : limit || undefined,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.submitTransaction(transaction);
      console.log('Success:', result.hash);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={action} onChange={(e) => setAction(e.target.value as any)}>
        <option value="create">Create Trustline</option>
        <option value="modify">Modify Limit</option>
        <option value="delete">Delete Trustline</option>
      </select>

      <input
        type="text"
        value={assetCode}
        onChange={(e) => setAssetCode(e.target.value)}
        placeholder="Asset Code (e.g., USDC)"
        required
      />

      <input
        type="text"
        value={assetIssuer}
        onChange={(e) => setAssetIssuer(e.target.value)}
        placeholder="Asset Issuer (G...)"
        required
      />

      {action !== 'delete' && (
        <input
          type="text"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="Limit (optional)"
        />
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : `${action} Trustline`}
      </button>
    </form>
  );
}
```

---

## Testing

### Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { Asset, Operation } from '@stellar/stellar-sdk';

describe('change_trust Operation', () => {
  it('creates operation with asset and limit', () => {
    const asset = new Asset(
      'USDC',
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    );
    const operation = Operation.changeTrust({
      asset,
      limit: '1000',
    });

    expect(operation.type).toBe('changeTrust');
    expect(operation.asset).toEqual(asset);
    expect(operation.limit).toBe('1000');
  });

  it('creates operation without limit', () => {
    const asset = new Asset(
      'USDC',
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    );
    const operation = Operation.changeTrust({ asset });

    expect(operation.limit).toBeUndefined();
  });
});
```

### Integration Test

```typescript
describe('Trustline Integration', () => {
  it('creates and deletes trustline', async () => {
    const keypair = Keypair.random();
    // Fund account via friendbot...

    const asset = new Asset(
      'USDC',
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    );

    // Create trustline
    await createTrustline(keypair.secret(), 'USDC', asset.issuer, '1000');

    // Verify trustline exists
    const account = await server.loadAccount(keypair.publicKey());
    const trustline = account.balances.find(
      (b: any) => b.asset_code === 'USDC'
    );
    expect(trustline).toBeDefined();

    // Delete trustline
    await deleteTrustline(keypair.secret(), 'USDC', asset.issuer);

    // Verify trustline deleted
    const updatedAccount = await server.loadAccount(keypair.publicKey());
    const deletedTrustline = updatedAccount.balances.find(
      (b: any) => b.asset_code === 'USDC'
    );
    expect(deletedTrustline).toBeUndefined();
  });
});
```

---

## Related Documentation

- [useTrustlines Hook](/docs/hooks/use-trustlines) - React hook for trustline management
- [Asset Compliance Flags](/docs/guides/asset-compliance-flags) - Understanding asset authorization
- [Stellar SDK Operations](/docs/sdk/api-reference) - Complete operation reference
- [Account Management](/docs/guides/reading-account-flags) - Account state and flags

---

## Summary

The `change_trust` operation is essential for working with custom assets on Stellar:

- **Create**: Establish trust with an optional limit
- **Modify**: Adjust the maximum balance limit
- **Delete**: Remove trustline (requires zero balance)
- **Parameters**: asset (required), limit (optional), source (optional)
- **Errors**: Handle no_trust, no_issuer, limit_overflow, line_full, underfunded
- **Best Practices**: Check existing trustlines, use conservative limits, clean up unused trustlines

Understanding trustlines is fundamental to building Stellar applications that handle custom assets.
