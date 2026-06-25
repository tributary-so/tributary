# x402 Getting Started Guide

This guide will walk you through integrating x402 v2 payments into your application, whether you're building a server that accepts payments or a client that pays for resources.

## Prerequisites

- Node.js 18+
- TypeScript knowledge
- Solana wallet (for testing on devnet)
- USDC tokens on devnet

## Installation

### For Server Implementation

```bash
npm install @tributary-so/x402 express
```

### For Client Implementation

```bash
npm install @tributary-so/sdk-x402 @solana/web3.js
```

## Step 1: Set Up Your Environment

Create a `.env` file:

```env
# RPC URL for Solana
RPC_URL=https://api.devnet.solana.com

# JWT secret for token generation
JWT_SECRET=your-super-secret-jwt-key

# Your wallet (base58 encoded private key)
WALLET_PRIVATE_KEY=[YOUR_BASE58_PRIVATE_KEY]

# Payment recipient (your wallet)
RECIPIENT_WALLET=your_wallet_address_here

# Gateway PDA from Tributary
GATEWAY_PDA=ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7

# USDC token mint (devnet)
TOKEN_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Payment amount (in smallest units - 100000 = 0.1 USDC)
PAYMENT_AMOUNT=100000

# Pay-as-you-go settings
MAX_AMOUNT_PER_PERIOD=1000000
PERIOD_LENGTH_SECONDS=86400
MAX_CHUNK_AMOUNT=100000
```

## Step 2: Build a Payment-Enabled Server

### Basic Pay-as-you-go Server

```typescript
// server.ts
import express from "express";
import { X402Server } from "@tributary-so/sdk-x402";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const server = new X402Server({
  rpcUrl: process.env.RPC_URL!,
  jwtSecret: process.env.JWT_SECRET!,
});

// Apply x402 middleware to protected routes
app.use(
  "/api/premium",
  server.middleware({
    scheme: "x402://payg",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    amount: parseInt(process.env.PAYMENT_AMOUNT!),
    recipient: process.env.RECIPIENT_WALLET!,
    gateway: process.env.GATEWAY_PDA!,
    tokenMint: process.env.TOKEN_MINT!,
    maxAmountPerPeriod: parseInt(process.env.MAX_AMOUNT_PER_PERIOD!),
    periodLengthSeconds: parseInt(process.env.PERIOD_LENGTH_SECONDS!),
    maxChunkAmount: parseInt(process.env.MAX_CHUNK_AMOUNT!),
  })
);

// Protected endpoint
app.get("/api/premium", (req, res) => {
  res.json({
    data: "🌟 This is premium content accessed via x402! 🌟",
    timestamp: new Date().toISOString(),
  });
});

// Health check (no payment required)
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💰 Payment required for /api/premium`);
});
```

### Subscription-Based Server

```typescript
// subscription-server.ts
import express from "express";
import { X402Server } from "@tributary-so/sdk-x402";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const server = new X402Server({
  rpcUrl: process.env.RPC_URL!,
  jwtSecret: process.env.JWT_SECRET!,
});

// Subscription middleware
app.use(
  "/api/subscription",
  server.middleware({
    scheme: "deferred",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    amount: parseInt(process.env.PAYMENT_AMOUNT!),
    recipient: process.env.RECIPIENT_WALLET!,
    gateway: process.env.GATEWAY_PDA!,
    tokenMint: process.env.TOKEN_MINT!,
    paymentFrequency: "monthly",
    autoRenew: true,
  })
);

app.get("/api/subscription", (req, res) => {
  res.json({
    data: "🔓 Premium subscription content",
    access: "unlimited for subscription period",
  });
});

app.listen(3000, () => {
  console.log("🚀 Subscription server running");
});
```

## Step 3: Build a Payment Client

### CLI Payment Client

```typescript
// client.ts
import { X402Client } from "@tributary-so/sdk-x402";
import { Keypair } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

// Load wallet from environment
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.WALLET_PRIVATE_KEY!))
);

const client = new X402Client({
  rpcUrl: process.env.RECURSOR_URL || "https://api.devnet.solana.com",
  wallet,
});

async function main() {
  const resourceUrl = process.argv[2] || "http://localhost:3000/api/premium";

  console.log(`🔗 Requesting: ${resourceUrl}`);

  try {
    const result = await client.createPayment({
      resource: resourceUrl,
      scheme: "x402://payg",
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      amount: parseInt(process.env.PAYMENT_AMOUNT!),
      recipient: process.env.RECIPIENT_WALLET!,
      gateway: process.env.GATEWAY_PDA!,
      tokenMint: process.env.TOKEN_MINT!,
      maxAmountPerPeriod: parseInt(process.env.MAX_AMOUNT_PER_PERIOD!),
      periodLengthSeconds: parseInt(process.env.PERIOD_LENGTH_SECONDS!),
      maxChunkAmount: parseInt(process.env.MAX_CHUNK_AMOUNT!),
    });

    console.log("✅ Payment successful!");
    console.log(`🎫 JWT: ${result.jwt.substring(0, 50)}...`);
    console.log(`📍 Policy: ${result.details.policyAddress}`);

    if (result.details.explorerUrl) {
      console.log(`🔗 Explorer: ${result.details.explorerUrl}`);
    }

    // Test accessing with JWT
    const response = await fetch(resourceUrl, {
      headers: {
        Authorization: `Bearer ${result.jwt}`,
      },
    });

    const content = await response.json();
    console.log("📄 Content:", content);
  } catch (error) {
    console.error("❌ Payment failed:", error);
    process.exit(1);
  }
}

main();
```

### Programmatic Usage

```typescript
import { X402Client } from "@tributary-so/sdk-x402";
import { Keypair } from "@solana/web3.js";

async function example() {
  const wallet = Keypair.generate(); // Or load from file/env
  const client = new X402Client({
    rpcUrl: "https://api.devnet.solana.com",
    wallet,
  });

  // Option 1: Create payment in one call
  const result = await client.createPayment({
    resource: "http://localhost:3000/api/premium",
    scheme: "x402://payg",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    amount: 100000,
    recipient: "8EVBvLDVhJUw1nkAUp73mPowviVFK9Wza5ba1GRANEw1",
    gateway: "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7",
    tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    maxAmountPerPeriod: 1000000,
    periodLengthSeconds: 86400,
    maxChunkAmount: 100000,
  });

  // Option 2: Request quote first
  const quote = await client.requestQuote("http://localhost:3000/api/premium");
  console.log("Quote:", quote);

  // Then create payment manually if needed
}

example();
```

## Step 4: Test Your Integration

### Start the Server

```bash
npx tsx server.ts
```

### Run the Client

```bash
npx tsx client.ts http://localhost:3000/api/premium
```

### Expected Output

```
🔗 Requesting: http://localhost:3000/api/premium
✅ Payment successful!
🎫 JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
📍 Policy: 3Zr...
🔗 Explorer: https://explorer.solana.com/tx/...
📄 Content: {"data":"🌟 This is premium content..."}
```

## Step 5: Verify on Solana Explorer

1. Copy the transaction signature from the output
2. Visit <https://explorer.solana.com/?cluster=devnet>
3. Search for your transaction
4. Verify the payment policy was created

## Common Issues

### "Insufficient USDC balance"

Get devnet USDC from the faucet:

```bash
spl-token faucet --url devnet
```

### "Wallet not found"

Ensure your wallet has SOL for transaction fees:

```bash
solana airdrop 2 --url devnet
```

### "Policy not found"

Verify the gateway PDA and recipient address are correct in your environment variables.

## Next Steps

- [x402 API Reference](./api-reference.md)
- [Usage Metering](./overview.md#usage-metering)
- [Pay-as-you-go Payments](../../../protocol-reference/payment-policy/payasyougo.md)
- [Protocol Reference](../../../protocol-reference/overview.md)
