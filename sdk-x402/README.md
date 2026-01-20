# x402 - HTTP 402 Payment Required Implementation

> **Built for Hackathons, Ready for Production** - The future of Web3 subscriptions starts here

## 🔥 The Problem We're Solving

Web3 has a massive subscription problem. The $1.5T global subscription economy is locked out of blockchain because:

- **No infrastructure** for recurring payments or billing
- **Manual approvals** kill UX - users abandon 67% of carts (Recurly 2024)
- **Businesses lose 30% revenue** from payment friction
- **Existing solutions fail** - they require KYC, manual payments, or complex multi-sig setups

We built Tributary to solve this. And now, we bring subscription over x402 to life with Tributary's automated, non-custodial subscriptions.

## 🚀 Our Solution: x402 + Tributary

x402 is the **first real implementation of HTTP 402** - the proposed status code for "Payment Required". Instead of just returning an error, x402 servers provide subscription quotes, and clients pay with signed Solana transactions.

**Why this wins hackathons:**

- **Novel approach** - HTTP 402 was proposed in 1997, x402 got traction in the last months, subscriptions are still an open question
- **Real Web3 innovation** - Solves a billion-dollar problem with elegant tech
- **Production-ready** - Live on Solana mainnet, sub-cent fees, 400ms settlement
- **Developer-friendly** - Simple SDK, quick integration

## 🏗️ How It Works

### The Deferred x402 Flow

1. **Client requests premium content**

   ```bash
   GET /premium
   ```

2. **Server responds with 402 Payment Required**

   ```json
   {
     "accepts": [
       {
         "scheme": "deferred",
         "network": "solana-devnet",
         "resource": "https://example.com/premium",
         "id": "sub_1234567890_abc123def",
         "termsUrl": "https://tributary.so/terms",
         "amount": 100,
         "currency": "USDC",
         "recipient": "8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1",
         "gateway": "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7",
         "tokenMint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
         "paymentFrequency": "monthly",
         "autoRenew": true
       }
     ]
   }
   ```

3. **Client creates subscription transaction** using Tributary SDK
4. **Client signs and sends back** via `X-Payment` header with deferred scheme
5. **Server verifies, submits, and confirms** on-chain immediately
6. **Server returns JWT** as proof of deferred subscription
7. **Client uses JWT** for future access to premium content

## 🛠️ Technical Architecture

### Client (`client.ts`)

- **Environment**: Node.js with Solana Web3.js
- **SDK Integration**: Uses `@tributary-so/sdk` for subscription creation
- **Security**: Signs transactions locally, never exposes private keys
- **Verification**: Double-checks subscription creation on-chain

### Server (`server.ts`)

- **Framework**: Express.js
- **Blockchain**: Solana (devnet/mainnet)
- **Verification**: Simulates transactions before submission
- **Confirmation**: Waits for on-chain confirmation and verifies policy creation

### Facilitator

- also called gateway or processor in the context of Tributary
- executes payments - triggers transfer on chain when subscription is due

### Tributary Integration

x402 leverages Tributary's smart contract infrastructure:

- **Non-custodial**: Funds stay in user wallets until payment due
- **Automated execution**: Smart contracts handle recurring payments
- **Token delegation**: One-time approval enables unlimited payments
- **Fee structure**: Protocol fees + gateway fees

## 💡 Why x402 Beats the Competition

**Our edge:** We're the only solution that's **non-custodial, automated, and one-click**. Built on Tributary's battle-tested infrastructure.

## 🏆 Hackathon-Winning Features

- **🚀 Production Ready**: Live on mainnet
- **⚡ Performance**: Sub-cent fees, 400ms settlement on Solana
- **🔒 Security**: Non-custodial, funds stay in your wallet
- **🛡️ Trustless**: Smart contracts as payment intermediaries
- **🎯 Developer Experience**: <5 min integration, TypeScript SDK
- **📈 Scalable**: One protocol, unlimited businesses

## 🚀 Getting Started with the Demo

### Prerequisites

```bash
# Install dependencies
pnpm install
```

### Environment Setup

```bash
# Client environment
export RPC_URL="https://api.devnet.solana.com"
export KEYPAIR_PATH="./keypair.json"

# Server environment
export RPC_URL="https://api.devnet.solana.com"
export GATEWAY_AUTHORITY="ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7"
export TOKEN_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
export RECIPIENT_WALLET="8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1"
export SUBSCRIPTION_AMOUNT="100"  # 0.0001 USDC
```

### Run the Demo

```bash
# Terminal 1: Start server
cd x402 && tsx server.ts

# Terminal 2: Run client
cd x402 && tsx client.ts
```

Watch the magic happen - deferred subscription created, JWT returned, and premium content accessed via JWT!

## 📚 API Reference

### Server Endpoints

#### `GET /premium`

Returns deferred subscription quote, processes payment, or verifies JWT.

**Without headers:**

- Status: `402 Payment Required`
- Body: Deferred scheme offer with subscription details

**With X-Payment header:**

- Status: `200 OK`
- Body: JWT token + subscription confirmation
- Headers: `Payment-Response` with deferred scheme details

**With Authorization header (Bearer JWT):**

- Status: `200 OK`
- Body: Premium content (if JWT valid and subscription active)

### Client Functions

#### `createSubscriptionInstruction()`

Creates Solana instructions for deferred subscription setup using Tributary SDK.

#### `verifySubscriptionCreation()`

Verifies subscription policy was created correctly on-chain.

#### JWT Verification

Server validates JWT tokens and checks payment policy existence/validity on-chain.

## 🔗 Links & Resources

- **Live Demo**: [tributary.so](https://tributary.so)
- **GitHub**: [github.com/tributary-so](https://github.com/tributary-so)
- **Docs**: [docs.tributary.so](https://docs.tributary.so)
- **Contribute**: [contribute.so](https://contribute.so)

---

Built with ❤️ for the x402 Hackathon. Tributary has been built for #Cypherpunk
