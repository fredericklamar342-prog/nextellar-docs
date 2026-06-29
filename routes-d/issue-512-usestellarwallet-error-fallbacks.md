---
title: useStellarWallet Error Fallbacks
description: Document idiomatic error fallback patterns for useStellarWallet hook, including error states, fallback examples, and user messaging tips
---

# useStellarWallet Error Fallbacks

The `useStellarWallet` hook provides wallet connection and transaction capabilities, but network issues, user actions, and wallet problems can cause errors. Implementing proper error fallbacks ensures your application remains usable and provides clear feedback to users when things go wrong.

---

## Error States to Handle

### Connection Errors

| Error State          | Cause                                        | User Impact          |
| -------------------- | -------------------------------------------- | -------------------- |
| Wallet not installed | User doesn't have a Stellar wallet extension | Cannot connect       |
| User rejected        | User cancelled connection prompt             | Connection aborted   |
| Popup blocked        | Browser blocked wallet popup                 | Modal doesn't appear |
| Network timeout      | Horizon server unreachable                   | Connection fails     |
| Invalid network      | Wrong network configured                     | Connection fails     |

### Transaction Errors

| Error State          | Cause                            | User Impact          |
| -------------------- | -------------------------------- | -------------------- |
| Insufficient balance | Not enough XLM for transaction   | Payment fails        |
| Account unfunded     | Account doesn't exist on network | Operations fail      |
| Sequence mismatch    | Stale account sequence           | Transaction rejected |
| User rejected        | User cancelled signing           | Transaction aborted  |
| Trustline missing    | No trustline for asset           | Payment fails        |

### Balance Errors

| Error State         | Cause                       | User Impact            |
| ------------------- | --------------------------- | ---------------------- |
| Horizon unavailable | Server down or rate-limited | Balances don't load    |
| Account not found   | Invalid public key          | Cannot fetch balances  |
| Timeout             | Slow network response       | Loading state persists |

---

## Basic Fallback Pattern

### 1. Connection Fallback

Provide clear messaging and alternative actions when connection fails:

```tsx
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useState } from 'react';

export function WalletConnection() {
  const { connected, publicKey, connect, walletName } = useStellarWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      await connect();
    } catch (err: any) {
      if (err.message?.includes('not installed')) {
        setError(
          'No wallet found. Please install Freighter, Albedo, or xBull.'
        );
      } else if (err.message?.includes('User rejected')) {
        setError('Connection cancelled by user.');
      } else if (err.message?.includes('popup')) {
        setError('Please allow popups for this site and try again.');
      } else if (err.message?.includes('timeout')) {
        setError(
          'Connection timed out. Please check your network and try again.'
        );
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="wallet-connected">
        <p>Connected via {walletName}</p>
        <p className="text-sm text-muted-foreground">
          {publicKey?.slice(0, 8)}...{publicKey?.slice(-4)}
        </p>
      </div>
    );
  }

  return (
    <div className="wallet-connection">
      {error && (
        <div className="error-banner bg-red-50 border border-red-200 p-3 rounded-md mb-4">
          <p className="text-sm text-red-800">{error}</p>
          {error.includes('not installed') && (
            <div className="mt-2 flex gap-2">
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-600 hover:underline"
              >
                Install Freighter ↗
              </a>
              <a
                href="https://www.albedo.link/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-600 hover:underline"
              >
                Install Albedo ↗
              </a>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}
```

### 2. Transaction Fallback

Handle payment failures with specific error messages:

```tsx
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useState } from 'react';

export function PaymentForm() {
  const { connected, sendPayment } = useStellarWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!sendPayment) {
      setError('Wallet payment not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendPayment({
        to: recipient,
        amount: amount,
        asset: 'XLM',
      });
    } catch (err: any) {
      if (err.message?.includes('insufficient balance')) {
        setError('Insufficient XLM balance. Please fund your account.');
      } else if (err.message?.includes('User rejected')) {
        setError('Transaction cancelled by user.');
      } else if (err.message?.includes('op_underfunded')) {
        setError(
          'Account needs more XLM for minimum reserve (at least 2 XLM).'
        );
      } else if (err.message?.includes('no destination')) {
        setError('Destination account does not exist on the Stellar network.');
      } else if (err.message?.includes('tx_bad_seq')) {
        setError(
          'Sequence number mismatch. Please refresh the page and try again.'
        );
      } else {
        setError('Payment failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      {!connected && (
        <div className="warning-banner bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-4">
          <p className="text-sm text-yellow-800">
            Connect your wallet to send payments
          </p>
        </div>
      )}

      {error && (
        <div className="error-banner bg-red-50 border border-red-200 p-3 rounded-md mb-4">
          <p className="text-sm text-red-800">{error}</p>
          {error.includes('insufficient balance') && (
            <a
              href="https://laboratory.stellar.org/#account-creator?network=test"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-600 hover:underline mt-2 inline-block"
            >
              Fund with Friendbot (Testnet) ↗
            </a>
          )}
        </div>
      )}

      <input
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address (G...)"
        disabled={!connected || loading}
      />

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (XLM)"
        disabled={!connected || loading}
      />

      <button
        onClick={handlePayment}
        disabled={!connected || loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        {loading ? 'Sending...' : 'Send Payment'}
      </button>
    </div>
  );
}
```

### 3. Balance Fallback

Handle balance loading errors gracefully:

```tsx
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useState, useEffect } from 'react';

export function BalanceDisplay() {
  const { connected, balances, refreshBalances } = useStellarWallet();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (connected && balances.length === 0 && retryCount < 3) {
      // Auto-retry if balances are empty on connection
      const timer = setTimeout(() => {
        refreshBalances().catch(() => {
          setError('Failed to load balances. Please refresh manually.');
        });
        setRetryCount(retryCount + 1);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [connected, balances, refreshBalances, retryCount]);

  const handleManualRefresh = async () => {
    setError(null);
    try {
      await refreshBalances();
    } catch (err: any) {
      if (err.message?.includes('timeout')) {
        setError('Balance refresh timed out. Please check your network.');
      } else if (err.message?.includes('rate limit')) {
        setError('Rate limit exceeded. Please wait a moment before retrying.');
      } else {
        setError('Failed to refresh balances. Please try again.');
      }
    }
  };

  if (!connected) {
    return (
      <p className="text-muted-foreground">Connect wallet to view balances</p>
    );
  }

  if (error) {
    return (
      <div className="balance-error">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={handleManualRefresh}
          className="text-sm text-primary hover:underline mt-1"
        >
          Retry
        </button>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="no-balances">
        <p className="text-sm text-muted-foreground">No balances found</p>
        <button
          onClick={handleManualRefresh}
          className="text-sm text-primary hover:underline mt-1"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="balance-list">
      {balances.map((balance, index) => (
        <div key={index} className="flex justify-between">
          <span>{balance.asset_code || 'XLM'}</span>
          <span>{balance.balance}</span>
        </div>
      ))}
      <button
        onClick={handleManualRefresh}
        className="text-sm text-primary hover:underline mt-2"
      >
        Refresh Balances
      </button>
    </div>
  );
}
```

---

## Advanced Fallback Patterns

### 1. Error Boundary Component

Wrap wallet interactions in an error boundary:

```tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Wallet error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-fallback p-4 border border-red-200 rounded-md bg-red-50">
            <h3 className="font-semibold text-red-800">Wallet Error</h3>
            <p className="text-sm text-red-600 mt-1">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage
<WalletErrorBoundary>
  <WalletConnection />
</WalletErrorBoundary>;
```

### 2. Retry with Exponential Backoff

Implement automatic retry for transient errors:

```tsx
import { useState, useCallback } from 'react';

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetriable =
        error.message?.includes('timeout') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('network');

      if (!isRetriable || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage in component
const handleConnect = async () => {
  setLoading(true);
  try {
    await retryWithBackoff(() => connect(), 3, 1000);
  } catch (error) {
    setError('Connection failed after multiple attempts');
  } finally {
    setLoading(false);
  }
};
```

### 3. Optimistic UI Fallback

Show optimistic state while operations complete:

```tsx
import { useState } from 'react';

export function OptimisticPayment() {
  const { sendPayment } = useStellarWallet();
  const [payments, setPayments] = useState<
    Array<{ id: string; status: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async (recipient: string, amount: string) => {
    const tempId = Date.now().toString();

    // Optimistic update
    setPayments((prev) => [...prev, { id: tempId, status: 'pending' }]);

    try {
      await sendPayment({ to: recipient, amount, asset: 'XLM' });

      // Success update
      setPayments((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, status: 'success' } : p))
      );
    } catch (err: any) {
      // Error update
      setPayments((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, status: 'failed' } : p))
      );
      setError(err.message);
    }
  };

  return (
    <div>
      {payments.map((payment) => (
        <div
          key={payment.id}
          className={`payment-item payment-${payment.status}`}
        >
          {payment.status === 'pending' && <span>Sending...</span>}
          {payment.status === 'success' && <span>✓ Sent</span>}
          {payment.status === 'failed' && <span>✗ Failed</span>}
        </div>
      ))}
    </div>
  );
}
```

---

## User Messaging Tips

### 1. Be Specific and Actionable

❌ **Bad**: "Error occurred"

✅ **Good**: "Insufficient XLM balance. Please fund your account with at least 2 XLM."

### 2. Provide Next Steps

Always tell users what to do next:

```tsx
{
  error.includes('not installed') && (
    <div className="next-steps">
      <p>Please install a Stellar wallet:</p>
      <ul className="list-disc ml-4 mt-2">
        <li>
          <a href="https://freighter.app" target="_blank">
            Freighter
          </a>
        </li>
        <li>
          <a href="https://albedo.link" target="_blank">
            Albedo
          </a>
        </li>
        <li>
          <a href="https://xbull.io" target="_blank">
            xBull
          </a>
        </li>
      </ul>
    </div>
  );
}
```

### 3. Use Appropriate Severity Levels

Match visual design to error severity:

```tsx
const getErrorBanner = (error: string) => {
  if (error.includes('not installed') || error.includes('unfunded')) {
    return <div className="bg-yellow-50 border-yellow-200">{error}</div>; // Warning
  }
  if (error.includes('rejected') || error.includes('cancelled')) {
    return <div className="bg-blue-50 border-blue-200">{error}</div>; // Info
  }
  return <div className="bg-red-50 border-red-200">{error}</div>; // Error
};
```

### 4. Preserve User Input

Don't clear forms on error:

```tsx
const handlePayment = async () => {
  try {
    await sendPayment({ to: recipient, amount, asset: 'XLM' });
    // Only clear on success
    setRecipient('');
    setAmount('');
  } catch (error) {
    // Keep values for retry
    setError(error.message);
  }
};
```

### 5. Show Loading States

Prevent duplicate actions during loading:

```tsx
<button
  onClick={handleConnect}
  disabled={loading}
  className={loading ? 'opacity-50 cursor-not-allowed' : ''}
>
  {loading ? (
    <span className="flex items-center gap-2">
      <Spinner className="animate-spin" />
      Connecting...
    </span>
  ) : (
    'Connect Wallet'
  )}
</button>
```

---

## Complete Fallback Component

```tsx
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useState } from 'react';

export function RobustWalletInterface() {
  const {
    connected,
    publicKey,
    balances,
    connect,
    disconnect,
    sendPayment,
    refreshBalances,
  } = useStellarWallet();
  const [error, setError] = useState<{ type: string; message: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const clearError = () => setError(null);

  const handleConnect = async () => {
    setLoading(true);
    clearError();

    try {
      await connect();
    } catch (err: any) {
      if (err.message?.includes('not installed')) {
        setError({
          type: 'wallet',
          message: 'No wallet found. Please install Freighter or Albedo.',
        });
      } else if (err.message?.includes('User rejected')) {
        setError({ type: 'user', message: 'Connection cancelled.' });
      } else if (err.message?.includes('popup')) {
        setError({
          type: 'browser',
          message: 'Please allow popups for this site.',
        });
      } else {
        setError({
          type: 'network',
          message: 'Connection failed. Please check your network.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!connected || !sendPayment) {
      setError({
        type: 'wallet',
        message: 'Please connect your wallet first.',
      });
      return;
    }

    setLoading(true);
    clearError();

    try {
      await sendPayment({ to: recipient, amount, asset: 'XLM' });
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      if (err.message?.includes('insufficient balance')) {
        setError({
          type: 'balance',
          message: 'Insufficient XLM balance. Fund your account.',
        });
      } else if (err.message?.includes('User rejected')) {
        setError({ type: 'user', message: 'Transaction cancelled.' });
      } else if (err.message?.includes('no destination')) {
        setError({
          type: 'validation',
          message: 'Destination account does not exist.',
        });
      } else {
        setError({
          type: 'network',
          message: 'Payment failed. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorActions = () => {
    switch (error?.type) {
      case 'wallet':
        return (
          <div className="flex gap-2 mt-2">
            <a
              href="https://freighter.app"
              target="_blank"
              className="text-sm underline"
            >
              Install Freighter
            </a>
            <a
              href="https://albedo.link"
              target="_blank"
              className="text-sm underline"
            >
              Install Albedo
            </a>
          </div>
        );
      case 'balance':
        return (
          <a
            href="https://laboratory.stellar.org/#account-creator?network=test"
            target="_blank"
            className="text-sm underline mt-2 inline-block"
          >
            Fund with Friendbot
          </a>
        );
      default:
        return (
          <button onClick={clearError} className="text-sm underline mt-2">
            Dismiss
          </button>
        );
    }
  };

  return (
    <div className="wallet-interface space-y-4">
      {error && (
        <div className="error-banner bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-sm text-red-800">{error.message}</p>
          {getErrorActions()}
        </div>
      )}

      {!connected ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="connected-state space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Connected</p>
              <p className="text-sm text-muted-foreground">
                {publicKey?.slice(0, 8)}...{publicKey?.slice(-4)}
              </p>
            </div>
            <button
              onClick={disconnect}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Disconnect
            </button>
          </div>

          <div className="balance-section">
            <h3 className="font-medium mb-2">Balances</h3>
            {balances.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No balances found.{' '}
                <button
                  onClick={refreshBalances}
                  className="text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {balances.map((balance, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{balance.asset_code || 'XLM'}</span>
                    <span>{balance.balance}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="payment-section space-y-2">
            <h3 className="font-medium">Send Payment</h3>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient address"
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (XLM)"
              className="w-full px-3 py-2 border rounded-md"
            />
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              {loading ? 'Sending...' : 'Send Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Error Fallbacks

### Unit Test

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Wallet Error Fallbacks', () => {
  it('handles wallet not installed error', () => {
    const mockConnect = vi
      .fn()
      .mockRejectedValue(new Error('Wallet not installed'));

    // Test error message
    expect(mockConnect).rejects.toThrow('Wallet not installed');
  });

  it('provides correct fallback for insufficient balance', () => {
    const error = new Error('insufficient balance');
    const message = getErrorMessage(error);

    expect(message).toContain('Insufficient XLM balance');
  });
});
```

### Integration Test

```typescript
describe('Error Fallback Integration', () => {
  it('shows install prompt when wallet not found', async () => {
    const { getByText } = render(<WalletConnection />);

    const connectButton = getByText('Connect Wallet');
    fireEvent.click(connectButton);

    // Wait for error state
    await waitFor(() => {
      expect(getByText(/install/i)).toBeInTheDocument();
    });
  });
});
```

---

## Related Documentation

- [useStellarWallet Hook](/docs/hooks/use-stellar-wallet) - Complete hook reference
- [Hook Error Handling](/docs/guides/hook-error-handling) - Shared error patterns
- [Horizon Error Responses](/docs/guides/horizon-error-responses) - API error shapes
- [Stellar Wallets Integration](/docs/integrations/wallets) - Wallet-specific details

---

## Summary

Implementing proper error fallbacks for `useStellarWallet` is essential for a good user experience:

- **Connection Errors**: Handle wallet not installed, user rejection, popup blocking
- **Transaction Errors**: Handle insufficient balance, unfunded accounts, sequence mismatches
- **Balance Errors**: Handle timeouts, rate limits, network issues
- **User Messaging**: Be specific, actionable, and provide next steps
- **Fallback Patterns**: Use error boundaries, retry logic, optimistic UI
- **Testing**: Verify error states and fallback behavior

By anticipating and handling these error states gracefully, your application remains usable even when things go wrong.
