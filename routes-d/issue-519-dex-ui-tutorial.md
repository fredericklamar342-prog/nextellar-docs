---
title: Building a DEX UI on Stellar
description: A complete tutorial for building a decentralized exchange interface on Stellar, covering order books, offers, matching, and testing approaches
---

# Building a DEX UI on Stellar

A **Decentralized Exchange (DEX)** on Stellar allows users to trade assets directly without a centralized intermediary. Stellar's built-in decentralized exchange (DEX) functionality enables atomic swaps through the order book and offer system. This tutorial walks through building a complete DEX UI from scratch.

---

## Overview of Stellar's DEX

Stellar's DEX is built into the protocol and operates through:

- **Order Books**: Each trading pair (asset pair) maintains a buy and sell order book
- **Offers**: Users place offers to buy or sell assets at specific prices
- **Atomic Matching**: The ledger automatically matches compatible offers
- **Path Payments**: Allows trading across multiple assets to find the best rate

Unlike other blockchains where DEXs are smart contracts, Stellar's DEX is a core protocol feature, making it faster, cheaper, and more reliable.

---

## Core Concepts

### Assets and Trading Pairs

A trading pair consists of:

- **Base Asset**: What you're buying (e.g., USDC)
- **Counter Asset**: What you're selling (e.g., XLM)

The order book is identified by the pair: `selling_asset` / `buying_asset`.

### Offers

An offer represents:

- **Seller**: The account creating the offer
- **Selling Asset**: What they're selling
- **Buying Asset**: What they want in return
- **Amount**: Quantity of the selling asset
- **Price**: Ratio of buying to selling (n/d in Stellar's fractional representation)

### Order Book Structure

```
Sell Orders (Asks)     |    Price    |    Buy Orders (Bids)
-----------------------|-------------|-----------------------
10 USDC @ 5.00 XLM     |    5.00     | 50 XLM @ 0.19 USDC
25 USDC @ 4.80 XLM     |    4.80     | 30 XLM @ 0.20 USDC
15 USDC @ 4.50 XLM     |    4.50     | 20 XLM @ 0.22 USDC
```

---

## Step 1 — Fetching Order Books

Use the Stellar SDK to fetch order books for a trading pair:

```typescript
import { Horizon, Server } from '@stellar/stellar-sdk';

const server = new Server('https://horizon-testnet.stellar.org');

async function getOrderBook(
  sellingAsset: { code: string; issuer: string },
  buyingAsset: { code: string; issuer: string }
) {
  const orderBook = await server.orderBook(sellingAsset, buyingAsset).call();

  return {
    bids: orderBook.bids, // Buy orders (want to sell buying asset)
    asks: orderBook.asks, // Sell orders (want to sell selling asset)
  };
}

// Example: USDC/XLM order book
const orderBook = await getOrderBook(
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
  { code: 'XLM', issuer: '' } // XLM is native
);
```

### Order Book Response Shape

```typescript
interface OrderBookResponse {
  bids: Array<{
    price_r: { n: number; d: number }; // Price as fraction
    price: string; // Decimal price
    amount: string; // Amount for sale
    seller: string; // Account ID
  }>;
  asks: Array<{
    price_r: { n: number; d: number };
    price: string;
    amount: string;
    seller: string;
  }>;
}
```

---

## Step 2 — Displaying the Order Book UI

Create a React component to display the order book:

```tsx
import { useState, useEffect } from 'react';
import { Server } from '@stellar/stellar-sdk';

interface OrderBookProps {
  sellingAsset: { code: string; issuer: string };
  buyingAsset: { code: string; issuer: string };
}

export function OrderBook({ sellingAsset, buyingAsset }: OrderBookProps) {
  const [orderBook, setOrderBook] = useState<{
    bids: any[];
    asks: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderBook = async () => {
      const server = new Server('https://horizon-testnet.stellar.org');
      const response = await server.orderBook(sellingAsset, buyingAsset).call();
      setOrderBook({
        bids: response.bids.slice(0, 10), // Top 10 bids
        asks: response.asks.slice(0, 10), // Top 10 asks
      });
      setLoading(false);
    };

    fetchOrderBook();
    // Refresh every 10 seconds
    const interval = setInterval(fetchOrderBook, 10000);
    return () => clearInterval(interval);
  }, [sellingAsset, buyingAsset]);

  if (loading) return <div>Loading order book...</div>;

  return (
    <div className="order-book">
      <h3>Order Book</h3>

      <div className="asks">
        <h4>Sell Orders (Asks)</h4>
        <table>
          <thead>
            <tr>
              <th>Price ({buyingAsset.code})</th>
              <th>Amount ({sellingAsset.code})</th>
              <th>Total ({buyingAsset.code})</th>
            </tr>
          </thead>
          <tbody>
            {orderBook?.asks.reverse().map((ask, i) => (
              <tr key={i}>
                <td className="ask-price">{ask.price}</td>
                <td>{ask.amount}</td>
                <td>
                  {(parseFloat(ask.price) * parseFloat(ask.amount)).toFixed(6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="spread">
        Spread:{' '}
        {orderBook?.asks[0]?.price && orderBook?.bids[0]?.price
          ? (
              parseFloat(orderBook.asks[0].price) -
              parseFloat(orderBook.bids[0].price)
            ).toFixed(6)
          : 'N/A'}
      </div>

      <div className="bids">
        <h4>Buy Orders (Bids)</h4>
        <table>
          <thead>
            <tr>
              <th>Price ({buyingAsset.code})</th>
              <th>Amount ({sellingAsset.code})</th>
              <th>Total ({buyingAsset.code})</th>
            </tr>
          </thead>
          <tbody>
            {orderBook?.bids.map((bid, i) => (
              <tr key={i}>
                <td className="bid-price">{bid.price}</td>
                <td>{bid.amount}</td>
                <td>
                  {(parseFloat(bid.price) * parseFloat(bid.amount)).toFixed(6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Step 3 — Creating Offers

Users can place offers to buy or sell assets. Here's how to create a sell offer:

```typescript
import {
  TransactionBuilder,
  Asset,
  Operation,
  Networks,
} from '@stellar/stellar-sdk';

async function createSellOffer(
  secretKey: string,
  sellingAsset: Asset,
  buyingAsset: Asset,
  amount: string,
  price: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();

  // Load account to get sequence number
  const account = await server.loadAccount(publicKey);

  // Parse price as fraction (e.g., "5.00" = 5/1)
  const priceParts = price.split('.');
  const priceN = parseInt(priceParts.join(''));
  const priceD = Math.pow(10, priceParts[1]?.length || 0);

  const transaction = new TransactionBuilder(account, {
    fee: '100', // 100 stroops (0.00001 XLM)
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: sellingAsset,
        buying: buyingAsset,
        amount: amount,
        price: { n: priceN, d: priceD },
        offerId: '0', // 0 = create new offer
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  const result = await server.submitTransaction(transaction);

  return result;
}

// Example: Sell 10 USDC for 5 XLM each
const sellingAsset = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
);
const buyingAsset = Asset.native(); // XLM

await createSellOffer(
  'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  sellingAsset,
  buyingAsset,
  '10', // 10 USDC
  '5.00' // 5 XLM per USDC
);
```

### Buy Offers

To create a buy offer (you want to buy an asset):

```typescript
.addOperation(
  Operation.manageBuyOffer({
    selling: sellingAsset,
    buying: buyingAsset,
    buyAmount: amount,
    price: { n: priceN, d: priceD },
    offerId: '0',
  })
)
```

---

## Step 4 — Managing Offers

Users need to view, modify, and cancel their offers:

```typescript
async function getUserOffers(publicKey: string) {
  const server = new Server('https://horizon-testnet.stellar.org');

  const offers = await server.offers().forAccount(publicKey).call();

  return offers.records;
}

async function cancelOffer(secretKey: string, offerId: string) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: Asset.native(),
        buying: Asset.native(),
        amount: '0',
        price: { n: 1, d: 1 },
        offerId: offerId, // Set offerId to cancel
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}
```

---

## Step 5 — Trade Execution UI

Create a trading form that allows users to place orders:

```tsx
import { useState } from 'react';
import {
  Asset,
  Operation,
  TransactionBuilder,
  Networks,
} from '@stellar/stellar-sdk';

interface TradeFormProps {
  publicKey: string;
  sellingAsset: Asset;
  buyingAsset: Asset;
}

export function TradeForm({
  publicKey,
  sellingAsset,
  buyingAsset,
}: TradeFormProps) {
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState<'sell' | 'buy'>('sell');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // This would typically be done via your backend or wallet
      // For demo purposes, showing the operation structure
      const priceParts = price.split('.');
      const priceN = parseInt(priceParts.join(''));
      const priceD = Math.pow(10, priceParts[1]?.length || 0);

      const operation =
        orderType === 'sell'
          ? Operation.manageSellOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              amount,
              price: { n: priceN, d: priceD },
              offerId: '0',
            })
          : Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount: amount,
              price: { n: priceN, d: priceD },
              offerId: '0',
            });

      console.log('Operation created:', operation);
      // Sign and submit transaction here
    } catch (error) {
      console.error('Trade failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="trade-form">
      <div className="order-type-toggle">
        <button
          type="button"
          className={orderType === 'sell' ? 'active' : ''}
          onClick={() => setOrderType('sell')}
        >
          Sell
        </button>
        <button
          type="button"
          className={orderType === 'buy' ? 'active' : ''}
          onClick={() => setOrderType('buy')}
        >
          Buy
        </button>
      </div>

      <div className="form-group">
        <label>
          {orderType === 'sell' ? 'Selling' : 'Buying'} {sellingAsset.code}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          step="0.0000001"
        />
      </div>

      <div className="form-group">
        <label>
          Price ({buyingAsset.code} per {sellingAsset.code})
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          step="0.0000001"
        />
      </div>

      <div className="form-group">
        <label>
          Total ({orderType === 'sell' ? buyingAsset.code : buyingAsset.code})
        </label>
        <input
          type="text"
          value={
            amount && price
              ? (parseFloat(amount) * parseFloat(price)).toFixed(7)
              : ''
          }
          readOnly
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : `Place ${orderType} Order`}
      </button>
    </form>
  );
}
```

---

## Step 6 — Path Payments for Best Rates

Stellar's path payments allow trading across multiple assets to get the best rate:

```typescript
async function findBestPath(
  sourceAsset: Asset,
  destinationAsset: Asset,
  amount: string,
  publicKey: string
) {
  const server = new Server('https://horizon-testnet.stellar.org');

  const strictReceivePaths = await server
    .strictReceivePaths(sourceAsset, destinationAsset, amount)
    .call();

  return strictReceivePaths.records;
}

async function executePathPayment(
  secretKey: string,
  sourceAsset: Asset,
  destinationAsset: Asset,
  destinationAmount: string,
  path: Asset[]
) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: sourceAsset,
        sendMax: '1000', // Maximum willing to send
        destination: keypair.publicKey(),
        destAsset: destinationAsset,
        destAmount: destinationAmount,
        path: path,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}
```

---

## Testing Approach

### Unit Testing

Test order book parsing and price calculations:

```typescript
import { describe, it, expect } from 'vitest';

describe('Order Book Calculations', () => {
  it('calculates total correctly', () => {
    const price = '5.00';
    const amount = '10';
    const total = parseFloat(price) * parseFloat(amount);
    expect(total).toBe(50);
  });

  it('parses Stellar price fraction correctly', () => {
    const price = '5.00';
    const parts = price.split('.');
    const n = parseInt(parts.join(''));
    const d = Math.pow(10, parts[1]?.length || 0);
    expect(n).toBe(500);
    expect(d).toBe(100);
    expect(n / d).toBe(5);
  });
});
```

### Integration Testing

Test against Stellar testnet:

```typescript
describe('DEX Integration Tests', () => {
  it('fetches order book for USDC/XLM', async () => {
    const server = new Server('https://horizon-testnet.stellar.org');
    const orderBook = await server
      .orderBook(
        {
          code: 'USDC',
          issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
        },
        { code: 'XLM', issuer: '' }
      )
      .call();

    expect(orderBook.bids).toBeDefined();
    expect(orderBook.asks).toBeDefined();
  });

  it('creates and cancels a test offer', async () => {
    // Use a test account with friendbot funding
    const testKeypair = StellarSdk.Keypair.random();
    // Fund account via friendbot...

    // Create offer
    // Cancel offer
    // Verify cancellation
  });
});
```

### Manual Testing Checklist

- [ ] Order book loads and displays correctly
- [ ] Order book refreshes automatically
- [ ] Spread calculation is accurate
- [ ] Sell offer creation works
- [ ] Buy offer creation works
- [ ] Offer cancellation works
- [ ] User's offers display correctly
- [ ] Path payment discovery works
- [ ] Error handling for insufficient balance
- [ ] Error handling for invalid price format

---

## Common Pitfalls

### 1. Price Representation

Stellar uses fractional representation (n/d) for prices to avoid floating-point errors:

```typescript
// Wrong
const price = 5.0;

// Correct
const price = { n: 500, d: 100 }; // 5.00 as fraction
```

### 2. Minimum Reserve

Accounts need minimum XLM balance to create offers:

- 1 XLM base reserve
- 0.5 XLM per offer
- 0.5 XLM per trustline

Always check account balance before creating offers.

### 3. Trustlines

Users must establish trustlines for custom assets before trading:

```typescript
async function createTrustline(secretKey: string, asset: Asset) {
  const server = new Server('https://horizon-testnet.stellar.org');
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const account = await server.loadAccount(keypair.publicKey());

  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: asset,
        limit: '1000000', // Maximum trustline amount
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);
  return await server.submitTransaction(transaction);
}
```

### 4. Offer Matching

Stellar matches offers automatically when:

- A new offer crosses the spread
- An existing offer is modified
- The ledger closes (every ~5 seconds)

Your UI should poll for order book updates to reflect matches.

---

## Complete DEX UI Example

Here's a complete component structure:

```tsx
import { useState, useEffect } from 'react';
import { Asset, Server } from '@stellar/stellar-sdk';

export function DEXInterface() {
  const [selectedPair, setSelectedPair] = useState({
    selling: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    },
    buying: { code: 'XLM', issuer: '' },
  });

  return (
    <div className="dex-container">
      <header>
        <h1>Stellar DEX</h1>
      </header>

      <div className="dex-main">
        <div className="order-book-section">
          <OrderBook
            sellingAsset={Asset.native()}
            buyingAsset={
              new Asset(selectedPair.selling.code, selectedPair.selling.issuer)
            }
          />
        </div>

        <div className="trade-section">
          <TradeForm
            publicKey={userPublicKey}
            sellingAsset={
              new Asset(selectedPair.selling.code, selectedPair.selling.issuer)
            }
            buyingAsset={Asset.native()}
          />
        </div>

        <div className="user-offers-section">
          <UserOffers publicKey={userPublicKey} />
        </div>
      </div>
    </div>
  );
}
```

---

## Related Documentation

- [useOfferBook Hook](/docs/hooks/use-offer-book) - React hook for offer book management
- [useStellarPayment Hook](/docs/hooks/use-stellar-payment) - Payment transaction building
- [Stellar Horizon Integration](/docs/integrations/horizon) - Horizon API details
- [Transaction Batching](/docs/guides/transaction-batching) - Optimizing multi-operation transactions

---

## Next Steps

After building your DEX UI:

1. Add real-time streaming using Horizon event streams
2. Implement price charts and historical data
3. Add slippage protection for large orders
4. Create liquidity pool integration (AMM)
5. Add advanced order types (limit, stop-loss)
6. Implement portfolio tracking

---

**Note**: This tutorial focuses on the protocol-level DEX. For production use, consider using Stellar's AMM (Automated Market Maker) for liquidity provision, which offers different mechanics than the traditional order book model.
