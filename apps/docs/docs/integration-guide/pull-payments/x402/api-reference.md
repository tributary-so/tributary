# x402 API Reference

Complete API reference for the x402 v2 implementation.

## X402Client

The `X402Client` class provides client-side functionality for creating and managing payments.

### Constructor

```typescript
new X402Client(config: X402ClientConfig)
```

**X402ClientConfig**

| Property     | Type                                        | Required | Description                               |
| ------------ | ------------------------------------------- | -------- | ----------------------------------------- |
| `rpcUrl`     | string                                      | Yes      | Solana RPC endpoint URL                   |
| `wallet`     | Keypair                                     | Yes      | Wallet for signing transactions           |
| `commitment` | `'processed' \| 'confirmed' \| 'finalized'` | No       | Commitment level (default: `'confirmed'`) |

### Methods

#### requestQuote()

```typescript
async requestQuote(resourceUrl: string): Promise<PaymentQuote>
```

Requests a payment quote from a server.

**Parameters:**

- `resourceUrl` (string): URL of the protected resource

**Returns:** `Promise<PaymentQuote>` - Payment requirements from the server

**Example:**

```typescript
const quote = await client.requestQuote("https://api.example.com/premium");
console.log(quote.amount); // 100000
console.log(quote.scheme); // 'x402://payg'
```

#### createPayment()

```typescript
async createPayment(options: CreatePaymentOptions): Promise<PaymentResult>
```

Creates a payment for a resource in a single call.

**Parameters:**

- `options` (CreatePaymentOptions): Payment configuration

**CreatePaymentOptions**

| Property              | Type                                            | Required | Description                              |
| --------------------- | ----------------------------------------------- | -------- | ---------------------------------------- |
| `resource`            | string                                          | Yes      | Resource URL being accessed              |
| `scheme`              | `deferred` \| `x402://payg` \| `x402://prepaid` | Yes      | Payment scheme                           |
| `network`             | string                                          | Yes      | CAIP-2 chain identifier                  |
| `amount`              | number                                          | Yes      | Payment amount in smallest units         |
| `recipient`           | string                                          | Yes      | Recipient wallet address                 |
| `gateway`             | string                                          | Yes      | Gateway/facilitator address              |
| `tokenMint`           | string                                          | Yes      | Token mint address                       |
| `paymentFrequency`    | `PaymentFrequencyString`                        | No       | Payment frequency (subscriptions)        |
| `autoRenew`           | boolean                                         | No       | Auto-renew flag (subscriptions)          |
| `maxRenewals`         | number \| null                                  | No       | Maximum renewals (subscriptions)         |
| `maxAmountPerPeriod`  | number                                          | No       | Max per period (pay-as-you-go)           |
| `periodLengthSeconds` | number                                          | No       | Period length in seconds (pay-as-you-go) |
| `maxChunkAmount`      | number                                          | No       | Max chunk amount (pay-as-you-go)         |

**Returns:** `Promise<PaymentResult>` - Payment result with JWT

**Example:**

```typescript
const result = await client.createPayment({
  resource: "https://api.example.com/premium",
  scheme: "x402://payg",
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  amount: 100000,
  recipient: "8EVBv...",
  gateway: "ConT...",
  tokenMint: "4zMM...",
  maxAmountPerPeriod: 1000000,
  periodLengthSeconds: 86400,
  maxChunkAmount: 100000,
});

console.log(result.jwt); // JWT token for future access
```

#### getPolicies()

```typescript
async getPolicies(): Promise<Array<{ address: string; type: string; active: boolean }>>
```

Gets all payment policies for the configured wallet.

**Returns:** `Promise<PolicySummary[]>` - Array of policy summaries

**Example:**

```typescript
const policies = await client.getPolicies();
policies.forEach((p) => {
  console.log(`${p.address} - ${p.type} - ${p.active ? "active" : "inactive"}`);
});
```

## X402Server

The `X402Server` class provides server-side functionality for verifying and processing payments.

### Constructor

```typescript
new X402Server(config: X402ServerConfig)
```

**X402ServerConfig**

| Property     | Type                                        | Required | Description                               |
| ------------ | ------------------------------------------- | -------- | ----------------------------------------- |
| `rpcUrl`     | string                                      | Yes      | Solana RPC endpoint URL                   |
| `jwtSecret`  | string                                      | Yes      | Secret for JWT token generation           |
| `commitment` | `'processed' \| 'confirmed' \| 'finalized'` | No       | Commitment level (default: `'confirmed'`) |

### Methods

#### middleware()

```typescript
middleware(config: X402MiddlewareConfig): RequestHandler
```

Creates an Express middleware for payment verification.

**Parameters:**

- `config` (X402MiddlewareConfig): Middleware configuration

**X402MiddlewareConfig**

| Property              | Type                        | Required | Description                              |
| --------------------- | --------------------------- | -------- | ---------------------------------------- |
| `scheme`              | `deferred` \| `x402://payg` | Yes      | Payment scheme                           |
| `network`             | string                      | Yes      | CAIP-2 chain identifier                  |
| `amount`              | number                      | Yes      | Payment amount in smallest units         |
| `recipient`           | string                      | Yes      | Recipient wallet address                 |
| `gateway`             | string                      | Yes      | Gateway/facilitator address              |
| `tokenMint`           | string                      | Yes      | Token mint address                       |
| `paymentFrequency`    | string                      | No       | Payment frequency (subscriptions)        |
| `autoRenew`           | boolean                     | No       | Auto-renew flag (subscriptions)          |
| `maxRenewals`         | number \| null              | No       | Maximum renewals (subscriptions)         |
| `maxAmountPerPeriod`  | number                      | No       | Max per period (pay-as-you-go)           |
| `periodLengthSeconds` | number                      | No       | Period length in seconds (pay-as-you-go) |
| `maxChunkAmount`      | number                      | No       | Max chunk amount (pay-as-you-go)         |

**Returns:** `RequestHandler` - Express middleware function

**Example:**

```typescript
const server = new X402Server({
  rpcUrl: "https://api.devnet.solana.com",
  jwtSecret: process.env.JWT_SECRET!,
});

app.use(
  "/api/premium",
  server.middleware({
    scheme: "x402://payg",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    amount: 100000,
    recipient: "8EVBv...",
    gateway: "ConT...",
    tokenMint: "4zMM...",
    maxAmountPerPeriod: 1000000,
    periodLengthSeconds: 86400,
    maxChunkAmount: 100000,
  })
);
```

#### verifyPolicy()

```typescript
async verifyPolicy(policyAddress: string): Promise<PolicyVerification>
```

Verifies a payment policy on-chain.

**Parameters:**

- `policyAddress` (string): Policy PDA address

**Returns:** `Promise<PolicyVerification>` - Verification result

**Example:**

```typescript
const verification = await server.verifyPolicy("3Zr...");
if (verification.valid) {
  console.log(`Policy active: ${verification.type}`);
  console.log(`Total paid: ${verification.details.totalPaid}`);
}
```

## Usage Metering

### UsageTracker

```typescript
new UsageTracker(config: UsageTrackerConfig)
```

Tracks usage for pay-as-you-go payments.

**UsageTrackerConfig**

| Property              | Type                                     | Required | Description                    |
| --------------------- | ---------------------------------------- | -------- | ------------------------------ |
| `sdk`                 | Tributary                                | Yes      | Tributary SDK instance         |
| `connection`          | Connection                               | Yes      | Solana connection              |
| `policyAddress`       | string                                   | Yes      | Policy PDA address             |
| `periodLengthSeconds` | number                                   | No       | Period length (default: 86400) |
| `limits`              | Partial<Record<MeteredResource, number>> | No       | Resource limits                |
| `maxChunkAmount`      | number                                   | Yes      | Maximum chunk amount           |
| `onLimitWarning`      | Function                                 | No       | Warning callback               |
| `onLimitExceeded`     | Function                                 | No       | Exceeded callback              |

**Methods:**

| Method                                    | Description                |
| ----------------------------------------- | -------------------------- |
| `trackUsage(requestId, usage, metadata?)` | Track a request's usage    |
| `getCurrentPeriod()`                      | Get current period summary |
| `getUsageSince(timestamp)`                | Get usage since timestamp  |
| `checkQuota(resource, expected)`          | Check remaining quota      |
| `resetPeriod()`                           | Reset current period       |

### TokenMeter

```typescript
// Parse usage from OpenAI response
TokenMeter.fromOpenAI(response: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }): Partial<Record<MeteredResource, number>>

// Estimate tokens from text
TokenMeter.estimateFromText(text: string): number

// Estimate tokens from JSON
TokenMeter.estimateFromJSON(json: unknown): number
```

### ComputeMeter

```typescript
// Calculate compute units for LLM
ComputeMeter.calculateForLLM(model: string, inputTokens: number, outputTokens: number): number

// Calculate compute units for embedding
ComputeMeter.calculateForEmbedding(model: string, dimensions: number, inputTokens: number): number

// Calculate compute units for fine-tuning
ComputeMeter.calculateForFineTune(epochs: number, trainingExamples: number, modelSizeParams: number): number
```

## Types

### PaymentQuote

```typescript
interface PaymentQuote {
  scheme: PaymentScheme;
  network: string;
  resource: string;
  id: string;
  termsUrl: string;
  amount: number;
  currency: string;
  recipient: string;
  gateway: string;
  tokenMint: string;
  paymentFrequency?: string;
  autoRenew?: boolean;
  maxRenewals?: number | null;
  maxAmountPerPeriod?: number;
  periodLengthSeconds?: number;
  maxChunkAmount?: number;
}
```

### PaymentResult

```typescript
interface PaymentResult {
  jwt: string;
  details: {
    policyAddress: string;
    scheme: PaymentScheme;
    paymentId: string;
    explorerUrl?: string;
  };
}
```

### MeteredResource

```typescript
type MeteredResource =
  | "requests"
  | "tokens.in"
  | "tokens.out"
  | "tokens.total"
  | "compute.units"
  | "time.ms"
  | "bytes.in"
  | "bytes.out"
  | "storage.bytes"
  | "storage.ops"
  | "credits"
  | "gpu.ms"
  | "fine_tune.ops"
  | "embedding.dims";
```

### PeriodSummary

```typescript
interface PeriodSummary {
  startTime: number;
  endTime: number;
  totalUsage: Partial<Record<MeteredResource, number>>;
  requestCount: number;
  totalCost: number;
  policyAddress: string;
}
```

## Utilities

### formatAmount()

```typescript
function formatAmount(amount: number, decimals?: number): string;
```

Formats an amount from smallest units to human-readable format.

**Example:**

```typescript
formatAmount(1000000, 6); // "1.000000"
```

### parseAmount()

```typescript
function parseAmount(amount: string, decimals?: number): number;
```

Parses a human-readable amount to smallest units.

**Example:**

```typescript
parseAmount("1.5", 6); // 1500000
```

## HTTP Headers

### Payment Header

**Client → Server**

```http
Payment: <base64-encoded JSON>
```

**Payload Format:**

```json
{
  "x402Version": 2,
  "scheme": "x402://payg",
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "id": "payg_1699999999_abc123",
  "payload": {
    "serializedTransaction": "<base64-encoded transaction>"
  }
}
```

### Payment-Required Header

**Server → Client (402 Response)**

```http
Payment-Required: scheme="x402://payg", network="solana:...", resource="https://...", id="...", amount=100000, currency="USDC", ...
```

### Payment-Response Header

**Server → Client (200 Response)**

```http
Payment-Response: scheme="x402://payg", network="solana:...", id="payg_...", timestamp=1699999999
```

## Error Responses

### 402 Payment Required

```json
{
  "accepts": [
    {
      "scheme": "x402://payg",
      "network": "solana:...",
      "resource": "https://api.example.com/premium",
      "id": "payg_...",
      "amount": 100000,
      "currency": "USDC",
      "recipient": "...",
      "gateway": "...",
      "tokenMint": "...",
      "maxAmountPerPeriod": 1000000,
      "periodLengthSeconds": 86400,
      "maxChunkAmount": 100000
    }
  ]
}
```

### 400 Bad Request

```json
{
  "error": "Invalid Payment header format"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid JWT token"
}
```

### 402 Payment Failed

```json
{
  "error": "Payment processing failed",
  "details": "Transaction simulation failed"
}
```
