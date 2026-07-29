# @tributary-so/sdk-x402

> **HTTP 402 Payment Required Implementation** - The first real implementation of HTTP 402 with Solana subscriptions via Tributary. Transform any API into a paywall with one line of code.

## Key Features

- 🚀 **HTTP 402 v2 Compliant** - Full implementation of the Payment Required standard
- 💰 **Deferred Subscriptions** - Non-custodial subscriptions with automated recurring payments
- 📊 **Pay-as-you-Go Metering** - Token usage tracking, compute units, and flexible billing
- 🔒 **Trustless Architecture** - Smart contracts handle payments, no intermediaries
- ⚡ **Sub-Cent Fees** - 400ms settlement on Solana mainnet
- 🛠️ **Express Middleware** - Drop-in payment verification for any Node.js API
- 🔑 **JWT Authentication** - Seamless access control after payment
- 📈 **Production Ready** - Live on Solana mainnet with battle-tested infrastructure

## Tech Stack

- **Language**: TypeScript 5.7+
- **Runtime**: Node.js 16+
- **Framework**: Express.js 5.x
- **Blockchain**: Solana (Anchor framework)
- **SDK**: @tributary-so/sdk (workspace)
- **Testing**: Jest with ts-jest
- **Package Manager**: pnpm
- **Build Tool**: TypeScript Compiler (tsc)
- **Linting**: ESLint + Prettier
- **Deployment**: npm package (private registry)

## Prerequisites

- Node.js 16 or higher
- pnpm (recommended) or npm
- A Solana wallet with devnet USDC for testing
- Access to Tributary gateway (contact Tributary team)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

This installs all dependencies including the Tributary SDK from the workspace.

### 2. Environment Setup

Copy the example environment file and configure:

```bash
# Server environment (for demo)
export RPC_URL="https://api.devnet.solana.com"
export GATEWAY_AUTHORITY="ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7"
export TOKEN_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
export RECIPIENT_WALLET="8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1"
export SUBSCRIPTION_AMOUNT="100"  # 0.0001 USDC in smallest units
export PAYMENT_FREQUENCY="monthly"
export AUTO_RENEW="true"
export JWT_SECRET="your-jwt-secret-here"

# Client environment (for demo)
export KEYPAIR_PATH="./keypair.json"  # Path to Solana keypair
```

### 3. Build the SDK

```bash
pnpm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 4. Run the Demo

Start the demo server:

```bash
# Terminal 1: Start x402 server
pnpm run server

# Terminal 2: Run client demo
pnpm run client
```

The client will:

1. Request premium content (gets 402 Payment Required)
2. Create a subscription transaction
3. Send payment proof to server
4. Receive JWT for future access

### 5. Test Metering Features

Visit the metering demo:

```bash
curl http://localhost:3001/metering
curl http://localhost:3001/metering?text=Hello+World
curl http://localhost:3001/metering?model=gpt-4
```

## Architecture

### Directory Structure

```
├── src/
│   ├── index.ts           # Main exports
│   ├── middleware.ts      # Express middleware for x402 payments
│   └── metering.ts        # Usage tracking and billing utilities
├── test/
│   ├── middleware.test.ts # Middleware unit tests
│   └── metering.test.ts   # Metering unit tests
├── server.ts              # Demo Express server
├── client.ts              # Demo payment client
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── jest.config.js         # Test configuration
```

### Request Flow (x402 v2)

```
Client Request → Express Server → x402 Middleware
                                      ↓
                               Check Authorization Header
                                      ↓
                            JWT Present? → Verify Policy
                                      ↓
                                 Valid JWT → Next()
                                      ↓
                            No JWT → Return 402 + Payment-Required Header
                                      ↓
Client Creates Payment → Sends Payment Header → Middleware Verifies
                                      ↓
                        Transaction Submitted → Policy Created → JWT Issued
```

### Key Components

#### x402 Middleware (`middleware.ts`)

**Core Functionality:**

- Intercepts requests requiring payment
- Validates JWT tokens for existing subscriptions
- Returns HTTP 402 with payment requirements
- Processes payment proofs and creates subscriptions
- Issues JWT tokens for verified payments

**Payment Schemes Supported:**

- `deferred` - Subscription payments (monthly, weekly, etc.)
- `x402://payg` - Pay-as-you-go with usage limits
- `x402://prepaid` - Prepaid credits
- `x402://upto` - Single-use, time-bound variable-amount authorization. The
  client authorizes a maximum pull (`maxAmount`) within `[validAfter,
deadline]`; the resource server settles the actual amount after usage
  (`0 <= actual <= max`). The authorization is consumed after one settlement.
  See ADR-0020.

**Headers Used:**

- `Payment-Required` - Contains payment requirements (x402 v2 format)
- `Payment-Response` - Contains payment confirmation
- `Payment` - Contains base64-encoded payment proof
- `Authorization: Bearer <jwt>` - For authenticated access

#### Metering System (`metering.ts`)

**Usage Tracking:**

- **Requests**: API call counting
- **Tokens**: Input/output token usage (LLM APIs)
- **Compute Units**: Processing cost estimation
- **Time**: Execution time tracking
- **Bytes**: Data transfer monitoring
- **Credits**: Generic usage units

**Built-in Estimators:**

- `TokenMeter` - Estimates token counts from text/JSON
- `ComputeMeter` - Calculates compute costs for LLM models
- `UsageTracker` - Tracks usage against policy limits

**Integration:**

```typescript
const tracker = new UsageTracker({
  sdk: tributarySdk,
  connection: solanaConnection,
  policyAddress: policyPDA,
  maxChunkAmount: 1000000, // Max payment per period
  limits: {
    "tokens.total": 100000, // 100K tokens per period
    requests: 1000, // 1000 requests per period
  },
});

// Track usage
tracker.trackUsage("req_123", {
  "tokens.in": 150,
  "tokens.out": 300,
  requests: 1,
});
```

### Database Schema (On-Chain)

The SDK integrates with Tributary's Solana program:

```
PaymentPolicy Account:
├── owner: PublicKey              # User who created the policy
├── tokenMint: PublicKey          # USDC mint
├── recipient: PublicKey          # Service provider
├── gateway: PublicKey            # Tributary gateway/facilitator
├── policyType:                   # Subscription or PayAsYouGo
│   ├── subscription:
│   │   ├── amount: u64          # Payment amount
│   │   ├── frequency: u8        # Payment frequency enum
│   │   └── autoRenew: bool      # Auto-renewal flag
│   └── payAsYouGo:
│       ├── maxAmountPerPeriod: u64
│       ├── periodLengthSeconds: u64
│       └── currentPeriodTotal: u64
├── status: PaymentStatus        # active, paused, cancelled
├── createdAt: i64               # Unix timestamp
└── updatedAt: i64               # Unix timestamp
```

## API Reference

### Express Middleware

```typescript
import express from "express";
import { createX402Middleware, X402Options } from "@tributary-so/sdk-x402";

const app = express();

const x402Config: X402Options = {
  scheme: "deferred",
  network: "solana-devnet",
  amount: 1000000, // 1 USDC in smallest units
  recipient: "RecipientWalletAddress",
  gateway: "GatewayWalletAddress",
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  paymentFrequency: "monthly",
  autoRenew: true,
  jwtSecret: "your-secret-key",
  sdk: tributarySdk,
  connection: solanaConnection,
};

app.get("/premium", createX402Middleware(x402Config), (req, res) => {
  res.json({ data: "Premium content!" });
});
```

### Metering Classes

#### TokenMeter

```typescript
import { TokenMeter } from "@tributary-so/sdk-x402";

// Estimate tokens from text
const tokens = TokenMeter.estimateFromText("Hello world!");
// Returns: 2

// Estimate from JSON
const jsonTokens = TokenMeter.estimateFromJSON({ message: "test" });
// Returns: 8

// Parse OpenAI usage
const usage = TokenMeter.fromOpenAI({
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
});
// Returns: { 'tokens.in': 100, 'tokens.out': 50, 'tokens.total': 150 }
```

#### ComputeMeter

```typescript
import { ComputeMeter } from "@tributary-so/sdk-x402";

// Calculate for LLM
const computeUnits = ComputeMeter.calculateForLLM(
  "gpt-4", // model
  1000, // input tokens
  500 // output tokens
);
// Returns: 65000 (model-specific multiplier applied)

// Calculate for embedding
const embeddingCost = ComputeMeter.calculateForEmbedding(
  "text-embedding-3-small",
  1536, // dimensions
  1000 // input tokens
);
// Returns: 20
```

#### UsageTracker

```typescript
import { UsageTracker } from "@tributary-so/sdk-x402";

const tracker = new UsageTracker({
  sdk: tributarySdk,
  connection: solanaConnection,
  policyAddress: policyPDA,
  maxChunkAmount: 1000000,
  limits: {
    "tokens.total": 100000,
    requests: 1000,
  },
});

// Track usage
tracker.trackUsage("request-123", {
  "tokens.in": 150,
  "tokens.out": 300,
  requests: 1,
});

// Check quota
const quota = tracker.checkQuota("tokens.total", 500);
// Returns: { allowed: true, remaining: 99550 }
```

### Type Definitions

```typescript
export interface X402Options {
  scheme: X402Scheme;
  network: string;
  amount: number;
  recipient: string;
  gateway: string;
  tokenMint: string;
  paymentFrequency?: string;
  autoRenew?: boolean;
  maxRenewals?: number | null;
  maxAmountPerPeriod?: number;
  periodLengthSeconds?: number;
  maxChunkAmount?: number;
  jwtSecret: string;
  sdk: Tributary;
  connection: Connection;
}

export interface UsageRecord {
  requestId: string;
  timestamp: number;
  usage: Partial<Record<MeteredResource, number>>;
  cost?: number;
  metadata?: Record<string, unknown>;
}
```

## Environment Variables

### Required

| Variable     | Description                  | Example                               |
| ------------ | ---------------------------- | ------------------------------------- |
| `RPC_URL`    | Solana RPC endpoint          | `https://api.mainnet-beta.solana.com` |
| `JWT_SECRET` | Secret for JWT token signing | `your-256-bit-secret`                 |

### Gateway Configuration

| Variable            | Description                 | Example                                        |
| ------------------- | --------------------------- | ---------------------------------------------- |
| `GATEWAY_AUTHORITY` | Tributary gateway authority | `ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7`  |
| `TOKEN_MINT`        | USDC token mint address     | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `RECIPIENT_WALLET`  | Your wallet address         | `YourWalletAddressHere`                        |

### Subscription Settings

| Variable              | Description              | Default            |
| --------------------- | ------------------------ | ------------------ |
| `SUBSCRIPTION_AMOUNT` | Amount in smallest units | `1000000` (1 USDC) |
| `PAYMENT_FREQUENCY`   | Payment frequency        | `monthly`          |
| `AUTO_RENEW`          | Auto-renewal enabled     | `true`             |
| `MAX_RENEWALS`        | Maximum renewals         | `null` (unlimited) |

### Demo Client

| Variable       | Description                 | Example          |
| -------------- | --------------------------- | ---------------- |
| `KEYPAIR_PATH` | Path to Solana keypair JSON | `./keypair.json` |

## Available Scripts

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `pnpm run build`        | Compile TypeScript to JavaScript |
| `pnpm run test`         | Run Jest test suite              |
| `pnpm run test:unit`    | Run specific metering tests      |
| `pnpm run server`       | Start demo Express server        |
| `pnpm run client`       | Run demo payment client          |
| `pnpm run lint`         | Run ESLint (currently exits 0)   |
| `pnpm run ci`           | Build, lint, and format check    |
| `pnpm run format`       | Format code with Prettier        |
| `pnpm run format:check` | Check Prettier formatting        |

## Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test -- --coverage

# Run specific test file
pnpm run test metering.test.ts

# Run in watch mode
pnpm run test -- --watch
```

### Test Structure

```
test/
├── middleware.test.ts    # x402 middleware tests
└── metering.test.ts      # Usage tracking tests
```

### Writing Tests

```typescript
import { describe, it, expect } from "@jest/globals";
import { TokenMeter } from "../src/metering.js";

describe("TokenMeter", () => {
  it("estimates tokens from text", () => {
    const tokens = TokenMeter.estimateFromText("Hello world!");
    expect(tokens).toBeGreaterThan(0);
    expect(typeof tokens).toBe("number");
  });

  it("handles empty text", () => {
    const tokens = TokenMeter.estimateFromText("");
    expect(tokens).toBe(0);
  });
});
```

### Test Configuration

Jest is configured in `jest.config.js` with:

- ESM support via `ts-jest/presets/default-esm`
- Module name mapping for `.js` extensions
- Test match pattern: `**/test/**/*.test.ts`

## Deployment

### As NPM Package

This SDK is designed to be published as a private npm package:

```bash
# Build for production
pnpm run build

# Publish to private registry
npm publish --registry https://your-registry.com
```

### Integration in Applications

```bash
# Install in your project
npm install @tributary-so/sdk-x402

# Or with pnpm
pnpm add @tributary-so/sdk-x402
```

### Docker Deployment (Demo)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "server"]
```

Build and run:

```bash
docker build -t x402-demo .
docker run -p 3001:3001 \
  -e RPC_URL=https://api.mainnet-beta.solana.com \
  -e JWT_SECRET=your-secret \
  x402-demo
```

## Troubleshooting

### Build Issues

**Error:** `Cannot find module '@tributary-so/sdk'`

**Solution:** Ensure the Tributary SDK is available in the workspace:

```bash
# If using pnpm workspace
pnpm install

# If SDK is not built
cd ../sdk && pnpm run build
```

### Runtime Errors

**Error:** `Transaction simulation failed`

**Solution:**

1. Check RPC_URL is accessible
2. Verify wallet has sufficient USDC balance
3. Ensure gateway and token mint addresses are correct
4. Check Solana network status

**Error:** `JWT verification failed`

**Solution:**

1. Ensure JWT_SECRET matches between server and client
2. Check token expiration (default 1 year)
3. Verify policy address in JWT payload exists on-chain

### Testing Issues

**Error:** `SyntaxError: Cannot use import statement outside a module`

**Solution:** Jest ESM configuration issue. Ensure `jest.config.js` has:

```javascript
export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
```

### Network Issues

**Error:** `Connection refused` or RPC timeouts

**Solution:**

1. Try different RPC endpoints:
   - `https://api.mainnet-beta.solana.com`
   - `https://solana-api.projectserum.com`
   - `https://rpc.ankr.com/solana`
2. Check network connectivity
3. Implement retry logic for production

### Payment Verification Issues

**Error:** `Policy not found` or `Payment verification failed`

**Solution:**

1. Wait for transaction confirmation (use `confirmed` commitment)
2. Check gateway authority is correct
3. Verify token mint matches expected USDC address
4. Ensure recipient address is valid

## Contributing

### Development Setup

```bash
# Clone and install
git clone https://github.com/tributary-so/tributary.git
cd tributary/sdk-x402
pnpm install

# Run tests in watch mode
pnpm run test -- --watch
```

### Code Style

- TypeScript with strict types
- ESLint + Prettier for formatting
- Jest for testing with 100% coverage target
- Commit messages follow conventional commits

### Pull Request Process

1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation if needed
5. Submit PR with description of changes

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for the x402 community. Part of the Tributary ecosystem for Web3 subscriptions.</content>
<parameter name="filePath">README.md
: minor bump to up and sync packages
