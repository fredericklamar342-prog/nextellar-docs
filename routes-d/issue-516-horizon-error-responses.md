---
title: Horizon Error Response Shapes
description: Document the shape of error responses from Stellar Horizon API, including common error fields, status code mappings, and examples
---

# Horizon Error Response Shapes

Horizon, Stellar's HTTP API, returns structured error responses for failed requests. Understanding these error shapes is critical for building robust applications that can handle network issues, validation failures, and transaction errors gracefully.

---

## Error Response Structure

All Horizon errors follow a consistent JSON structure:

```typescript
interface HorizonErrorResponse {
  title: string; // Human-readable error title
  type: string; // URI identifying the error type
  status: number; // HTTP status code
  detail: string; // Detailed error message
  instance?: string; // URI for the specific error instance
  extras?: Record<string, any>; // Additional error-specific data
}
```

### Example Error Response

```json
{
  "title": "Not Found",
  "type": "https://stellar.org/horizon-errors/not_found",
  "status": 404,
  "detail": "The resource at the url requested was not found. This usually means the resource doesn't exist, or the id provided is incorrect.",
  "instance": "https://horizon-testnet.stellar.org/transactions/invalidhash"
}
```

---

## Common Error Fields

### title

A short, human-readable summary of the error. Useful for displaying to users in UI error messages.

```typescript
const showError = (error: HorizonErrorResponse) => {
  alert(error.title); // e.g., "Not Found", "Bad Request"
};
```

### type

A URI that uniquely identifies the error type. This is useful for programmatic error handling:

```typescript
const isNotFoundError = (error: HorizonErrorResponse) => {
  return error.type === 'https://stellar.org/horizon-errors/not_found';
};
```

### status

The HTTP status code of the response. This should match the HTTP response status:

```typescript
const isServerError = (error: HorizonErrorResponse) => {
  return error.status >= 500;
};
```

### detail

A longer, more detailed explanation of what went wrong. This often includes context about the specific request:

```json
{
  "detail": "The resource at the url requested was not found. This usually means the resource doesn't exist, or the id provided is incorrect."
}
```

### extras

Additional error-specific data that varies by error type. Common extras include:

- `result_codes`: Transaction operation results
- `result_xdr`: XDR-encoded transaction result
- `envelope_xdr`: XDR-encoded transaction envelope

---

## Status Code Mappings

Horizon uses standard HTTP status codes to indicate error categories:

### 4xx Client Errors

| Status | Error Type        | Description                                       |
| ------ | ----------------- | ------------------------------------------------- |
| 400    | Bad Request       | Malformed request syntax or invalid parameters    |
| 401    | Unauthorized      | Missing or invalid authentication                 |
| 403    | Forbidden         | Valid authentication but insufficient permissions |
| 404    | Not Found         | Resource does not exist                           |
| 409    | Conflict          | Resource state conflicts with request             |
| 429    | Too Many Requests | Rate limit exceeded                               |

### 5xx Server Errors

| Status | Error Type            | Description                       |
| ------ | --------------------- | --------------------------------- |
| 500    | Internal Server Error | Unexpected server error           |
| 503    | Service Unavailable   | Horizon temporarily unavailable   |
| 504    | Gateway Timeout       | Request to Stellar core timed out |

---

## Common Error Types

### Not Found (404)

Requested resource doesn't exist:

```json
{
  "title": "Not Found",
  "type": "https://stellar.org/horizon-errors/not_found",
  "status": 404,
  "detail": "The resource at the url requested was not found."
}
```

**Common causes:**

- Invalid transaction hash
- Non-existent account
- Invalid ledger sequence

**Handling:**

```typescript
try {
  const transaction = await server.transactions().transaction(txHash).call();
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Transaction not found');
  }
}
```

---

### Bad Request (400)

Invalid request parameters or malformed data:

```json
{
  "title": "Bad Request",
  "type": "https://stellar.org/horizon-errors/bad_request",
  "status": 400,
  "detail": "The request you sent was invalid in some way.",
  "extras": {
    "invalid_field": "cursor",
    "reason": "cursor must be a valid stellar cursor"
  }
}
```

**Common causes:**

- Invalid query parameters
- Malformed transaction
- Invalid asset format

**Handling:**

```typescript
try {
  const transactions = await server
    .transactions()
    .limit(200) // Invalid: max is 100
    .call();
} catch (error) {
  if (error.response?.status === 400) {
    console.log('Invalid request:', error.response.data.extras);
  }
}
```

---

### Transaction Failed (400)

Transaction submission failed due to validation or execution errors:

```json
{
  "title": "Transaction Failed",
  "type": "https://stellar.org/horizon-errors/transaction_failed",
  "status": 400,
  "detail": "The transaction failed when submitted to the stellar network. The `extras` field on this error response will contain additional details.",
  "extras": {
    "envelope_xdr": "AAAA...",
    "result_codes": {
      "transaction": "tx_bad_seq",
      "operations": []
    },
    "result_xdr": "AAAA..."
  }
}
```

**Common result codes:**

| Code                      | Description                   |
| ------------------------- | ----------------------------- |
| `tx_bad_seq`              | Sequence number is incorrect  |
| `tx_insufficient_balance` | Insufficient XLM balance      |
| `tx_no_source_account`    | Source account doesn't exist  |
| `tx_failed`               | One or more operations failed |

**Handling:**

```typescript
try {
  const result = await server.submitTransaction(transaction);
} catch (error) {
  if (error.response?.data?.extras?.result_codes) {
    const codes = error.response.data.extras.result_codes;
    console.log('Transaction failed:', codes.transaction);

    if (codes.transaction === 'tx_bad_seq') {
      console.log('Sequence number mismatch - refresh account');
    }
  }
}
```

---

### Rate Limit Exceeded (429)

Too many requests in a short time period:

```json
{
  "title": "Rate Limit Exceeded",
  "type": "https://stellar.org/horizon-errors/rate_limit_exceeded",
  "status": 429,
  "detail": "This request has exceeded the rate limit for the given Horizon server.",
  "extras": {
    "retry_after": 60
  }
}
```

**Handling with exponential backoff:**

```typescript
async function fetchWithBackoff(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = (retryAfter ? parseInt(retryAfter) : 60) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

---

### Service Unavailable (503)

Horizon is temporarily unavailable (maintenance, overload):

```json
{
  "title": "Service Unavailable",
  "type": "https://stellar.org/horizon-errors/service_unavailable",
  "status": 503,
  "detail": "Horizon is temporarily unavailable. Please try again later."
}
```

**Handling:**

```typescript
try {
  const account = await server.loadAccount(publicKey);
} catch (error) {
  if (error.response?.status === 503) {
    // Queue request for retry
    setTimeout(() => retryRequest(), 5000);
  }
}
```

---

## Operation-Specific Errors

### Payment Errors

When payment operations fail, the error includes operation-level result codes:

```json
{
  "title": "Transaction Failed",
  "type": "https://stellar.org/horizon-errors/transaction_failed",
  "status": 400,
  "extras": {
    "result_codes": {
      "transaction": "tx_failed",
      "operations": ["op_no_destination", "op_underfunded", "op_no_trust"]
    }
  }
}
```

**Common operation codes:**

| Code                | Description                           |
| ------------------- | ------------------------------------- |
| `op_no_destination` | Destination account doesn't exist     |
| `op_underfunded`    | Insufficient balance for operation    |
| `op_no_trust`       | Destination lacks trustline for asset |
| `op_not_authorized` | Not authorized to hold asset          |
| `op_line_full`      | Trustline limit reached               |

---

### Change Trust Errors

```json
{
  "extras": {
    "result_codes": {
      "transaction": "tx_failed",
      "operations": ["op_no_issuer"]
    }
  }
}
```

**Common codes:**

- `op_no_issuer`: Issuer account doesn't exist
- `op_limit_overflow`: Limit exceeds maximum allowed
- `op_no_trust`: Trustline already exists

---

## Error Handling Best Practices

### 1. Always Check Response Status

```typescript
const response = await fetch(
  'https://horizon-testnet.stellar.org/accounts/invalid'
);
if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${error.status}: ${error.title}`);
}
```

### 2. Use Type Guards

```typescript
function isHorizonError(error: any): error is HorizonErrorResponse {
  return error?.title && error?.type && error?.status;
}

try {
  await submitTransaction(tx);
} catch (error) {
  if (isHorizonError(error)) {
    handleHorizonError(error);
  }
}
```

### 3. Extract User-Friendly Messages

```typescript
function getUserMessage(error: HorizonErrorResponse): string {
  const messages: Record<string, string> = {
    tx_bad_seq: 'Please refresh your account and try again',
    op_underfunded: 'Insufficient balance for this transaction',
    op_no_trust: 'Recipient needs to trust this asset first',
    rate_limit_exceeded: 'Too many requests. Please wait a moment.',
  };

  const resultCode =
    error.extras?.result_codes?.transaction ||
    error.extras?.result_codes?.operations?.[0];

  return messages[resultCode] || error.detail || 'An error occurred';
}
```

### 4. Log Full Error Context

```typescript
function logError(error: HorizonErrorResponse) {
  console.error('Horizon Error:', {
    title: error.title,
    type: error.type,
    status: error.status,
    detail: error.detail,
    extras: error.extras,
    timestamp: new Date().toISOString(),
  });
}
```

### 5. Implement Retry Logic for Transient Errors

```typescript
const RETRIABLE_STATUSES = [429, 500, 503, 504];

async function horizonRequestWithRetry(
  request: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (!isHorizonError(error)) throw error;

      if (
        !RETRIABLE_STATUSES.includes(error.status) ||
        attempt === maxRetries - 1
      ) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

---

## Complete Error Handler Example

```typescript
import { Horizon } from '@stellar/stellar-sdk';

interface HorizonErrorResponse {
  title: string;
  type: string;
  status: number;
  detail: string;
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
    retry_after?: number;
  };
}

class HorizonErrorHandler {
  static isHorizonError(error: any): error is HorizonErrorResponse {
    return error?.response?.data?.title !== undefined;
  }

  static getUserMessage(error: HorizonErrorResponse): string {
    const resultCode =
      error.extras?.result_codes?.transaction ||
      error.extras?.result_codes?.operations?.[0];

    const messages: Record<string, string> = {
      tx_bad_seq: 'Account sequence mismatch. Please refresh and try again.',
      tx_insufficient_balance: 'Insufficient XLM balance.',
      op_no_destination: 'Destination account does not exist.',
      op_underfunded: 'Insufficient balance for this operation.',
      op_no_trust: 'Trustline not established for this asset.',
      op_not_authorized: 'Not authorized to hold this asset.',
      rate_limit_exceeded: 'Rate limit exceeded. Please wait.',
    };

    return messages[resultCode || ''] || error.detail || 'Transaction failed';
  }

  static shouldRetry(error: HorizonErrorResponse): boolean {
    return [429, 500, 503, 504].includes(error.status);
  }

  static getRetryDelay(error: HorizonErrorResponse): number {
    if (error.extras?.retry_after) {
      return error.extras.retry_after * 1000;
    }
    return 5000; // Default 5 seconds
  }

  static async handle(error: unknown): Promise<never> {
    if (!this.isHorizonError(error)) {
      throw error; // Re-throw non-Horizon errors
    }

    console.error('Horizon Error:', {
      title: error.title,
      status: error.status,
      type: error.extras?.result_codes,
    });

    if (this.shouldRetry(error)) {
      const delay = this.getRetryDelay(error);
      console.log(`Retrying after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      throw error; // Caller should retry
    }

    const userMessage = this.getUserMessage(error);
    throw new Error(userMessage);
  }
}

// Usage
try {
  const result = await server.submitTransaction(transaction);
} catch (error) {
  await HorizonErrorHandler.handle(error);
}
```

---

## Testing Error Handling

### Unit Test

```typescript
import { describe, it, expect } from 'vitest';

describe('Horizon Error Handling', () => {
  it('identifies Horizon errors correctly', () => {
    const horizonError = {
      response: {
        data: {
          title: 'Not Found',
          type: 'https://stellar.org/horizon-errors/not_found',
          status: 404,
          detail: 'Resource not found',
        },
      },
    };

    expect(HorizonErrorHandler.isHorizonError(horizonError)).toBe(true);
  });

  it('provides user-friendly messages', () => {
    const error: HorizonErrorResponse = {
      title: 'Transaction Failed',
      type: 'https://stellar.org/horizon-errors/transaction_failed',
      status: 400,
      detail: 'Transaction failed',
      extras: {
        result_codes: {
          transaction: 'tx_bad_seq',
        },
      },
    };

    const message = HorizonErrorHandler.getUserMessage(error);
    expect(message).toContain('sequence mismatch');
  });
});
```

---

## Related Documentation

- [Hook Error Handling](/docs/guides/hook-error-handling) - Error patterns for React hooks
- [Stellar Horizon Integration](/docs/integrations/horizon) - Horizon API overview
- [Transaction Submission](/docs/guides/resilient-transaction-submission) - Robust transaction patterns
- [Rate Limiting](/docs/guides/rate-limiting-horizon-requests) - Handling rate limits

---

## Summary

Horizon's error responses are structured and predictable, making it possible to build robust error handling. Key points:

1. **Structure**: All errors have `title`, `type`, `status`, and `detail` fields
2. **Status Codes**: 4xx for client errors, 5xx for server errors
3. **Extras**: Additional context like result codes and XDR data
4. **Retry Logic**: Implement exponential backoff for 429, 500, 503, 504
5. **User Messages**: Translate technical errors into user-friendly messages
6. **Logging**: Always log full error context for debugging

By understanding these error shapes, you can build applications that handle failures gracefully and provide good user experiences even when things go wrong.
