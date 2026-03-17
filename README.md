# Tributary

Automated recurring payments on Solana using token delegation. Web2 subscription UX with Web3 transparency.

[![CI](https://github.com/tributary-so/tributary/actions/workflows/main.yaml/badge.svg)](https://github.com/tributary-so/tributary/actions/workflows/main.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com)

## Key Features

- **Automated Execution**: Payments execute automatically on schedule without user intervention
- **Full Control**: Users can pause, resume, or cancel subscriptions anytime
- **Protocol Design**: One smart contract enabling unlimited businesses on top
- **Fee Structure**: 1% protocol fee + configurable gateway fees (up to 10%)
- **Integration**: x402 HTTP 402 support for deferred micropayments
- **Action Codes**: Generate one-time payment codes for wallet-less transactions
- **Multiple Payment Types**: Subscriptions, Milestone Payments, and Pay-as-you-go models
- **Non-custodial**: Funds remain in user wallets with delegation-based automation

## Tech Stack

- **Language**: Rust (Smart Contract), TypeScript (SDKs & Apps)
- **Framework**: Anchor (Solana), React (Frontend), Vite (Build)
- **Blockchain**: Solana (Program ID: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`)
- **Deployment**: Docker, GitHub Actions CI/CD
- **Documentation**: MkDocs with Material theme
- **Package Manager**: pnpm (monorepo)

## Prerequisites

- Node.js 20.19+ or 22.12+
- pnpm 9.6.0+
- Rust & Anchor (for smart contract development)
- Solana CLI (for deployment)
- Docker (optional, for local development)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/tributary-so/tributary
cd tributary
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build All Packages

```bash
# Build SDK packages
pnpm --filter @tributary-so/sdk build
pnpm --filter @tributary-so/sdk-react build
pnpm --filter @tributary-so/sdk-x402 build

# Build CLI
pnpm --filter @tributary-so/cli build
```

### 4. Smart Contract Development

For smart contract development, you'll need Anchor and Solana CLI:

```bash
# Install Anchor (if not already installed)
avm use 0.31.0

# Build the program
anchor build

# Run tests
anchor test
```

### 5. Start Development Server

```bash
# Start the React app
cd app
pnpm run dev

# In another terminal, start the landing page
cd ../landing
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the app or [http://localhost:5174](http://localhost:5174) for the landing page.

## Architecture

### Directory Structure

```
├── programs/tributary/          # Solana smart contract (Rust/Anchor)
│   ├── src/
│   │   ├── lib.rs              # Main program entry point
│   │   ├── instructions/       # Program instructions
│   │   ├── state/              # Account state definitions
│   │   ├── policies.rs         # Payment policy types
│   │   └── utils.rs            # Utility functions
│   └── Cargo.toml
├── sdk/                        # TypeScript SDK
│   ├── src/
│   │   ├── index.ts            # Main SDK exports
│   │   ├── sdk.ts              # Core SDK functionality
│   │   ├── pda.ts              # PDA helpers
│   │   └── types.ts            # TypeScript types
│   └── package.json
├── sdk-react/                  # React components
│   ├── src/
│   │   ├── SubscriptionButton.tsx
│   │   └── index.ts
│   └── package.json
├── sdk-x402/                   # HTTP 402 payment middleware
│   ├── src/
│   │   ├── middleware.ts       # Express middleware
│   │   ├── metering.ts         # Usage tracking
│   │   └── index.ts
│   └── package.json
├── app/                        # React frontend application
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── lib/                # Utilities
│   │   └── pages/              # Application pages
│   ├── package.json
│   └── vite.config.ts
├── landing/                    # Marketing website
│   ├── src/
│   └── package.json
├── scheduler/                  # Payment execution scheduler
│   ├── src/
│   └── Dockerfile
├── tests/                      # Integration tests
│   ├── tributary.test.ts       # Full payment flow tests
│   └── package.json
├── docs/                       # Documentation (MkDocs)
│   ├── docs/                   # Markdown files
│   └── mkdocs.yml
└── cli/                        # CLI management tool
    ├── src/
    └── package.json
```

### Payment Flow Architecture

```
User → Create UserPayment (owner/mint)
    → Create PaymentGateway (authority/signer)
    → Create PaymentPolicy (user_payment/recipient/gateway)
    → Approve Delegate (token account delegation)
    → Execute Payment (permissionless, by gateway signer)
       → Transfer to recipient + fees
```

### PDAs (Program Derived Addresses)

- **ProgramConfig**: `["program_config"]` - Protocol settings and fees
- **PaymentGateway**: `["payment_gateway", authority]` - Gateway configuration
- **UserPayment**: `["user_payment", owner, mint]` - User payment tracking
- **PaymentPolicy**: `["payment_policy", user_payment, policy_id]` - Individual policies
- **PaymentsDelegate**: `["payments_delegate", user_payment, recipient, gateway]` - Delegation authority

### Payment Types

Tributary supports three distinct payment models:

#### 1. Subscriptions

Fixed recurring payments at regular intervals with auto-renewal options.

```rust
Subscription {
    amount: u64,                    // Fixed payment amount
    auto_renew: bool,               // Auto-renewal enabled
    max_renewals: Option<u32>,      // Maximum renewal limit
    payment_frequency: PaymentFrequency, // Daily/Weekly/Monthly/etc.
    next_payment_due: i64,          // Unix timestamp for next payment
}
```

#### 2. Milestone Payments

Project-based compensation with configurable milestones and release conditions.

```rust
Milestone {
    milestone_amounts: [u64; 4],      // Amount for each milestone
    milestone_timestamps: [i64; 4],   // When each milestone is payable
    current_milestone: u8,            // Which milestone is next (0-3)
    release_condition: u8,            // 0=time, 1=manual, 2=automatic
    total_milestones: u8,             // How many milestones (1-4)
    escrow_amount: u64,               // Total amount held in escrow
}
```

#### 3. Pay-as-you-go

Flexible usage-based billing with period-based limits and chunk-based claims.

```rust
PayAsYouGo {
    max_amount_per_period: u64,      // Total allowed per billing period
    max_chunk_amount: u64,           // Max per individual claim
    period_length_seconds: u64,       // Billing period duration
    current_period_start: i64,        // Current period start time
    current_period_total: u64,        // Amount claimed this period
}
```

## Checkout App & SDK Integration

The checkout app integrates with the Tributary SDK through a wrapper layer that abstracts blockchain complexity while maintaining full Web3 transparency.

```
User → Checkout Form → tributary.ts (wrapper) → @tributary-so/sdk → Solana Program
```

### Integration Architecture

| Layer   | File                                             | Purpose                                      |
| ------- | ------------------------------------------------ | -------------------------------------------- |
| UI      | `apps/checkout/src/components/checkout-form.tsx` | Collects user input, handles form submission |
| Wrapper | `apps/checkout/src/lib/tributary.ts`             | Maps UI format to SDK, handles conversions   |
| SDK     | `@tributary-so/sdk`                              | Program interaction, PDA derivation          |
| Program | `programs/tributary/`                            | Solana instructions, state management        |

### SDK Wrapper (`apps/checkout/src/lib/tributary.ts`)

The wrapper mirrors allowly's implementation with shared constants:

```typescript
// Shared configuration constants
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const GATEWAY_ADDRESS = new PublicKey(
  "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ"
);

export interface Subscription {
  recipient: string;
  amount: number; // USD amount (e.g., 10 for $10)
  frequency: "weekly" | "biweekly" | "monthly";
}

export async function createSubscription(
  sdk: Tributary,
  wallet: any,
  subscription: Subscription
) {
  // Convert USD to smallest units (1 USDC = 1,000,000)
  const amountInSmallestUnits = subscription.amount * 1_000_000;

  // Map UI frequency to SDK format
  let frequencyDays: number;
  switch (subscription.frequency) {
    case "weekly":
      frequencyDays = 7;
      break;
    case "biweekly":
      frequencyDays = 14;
      break;
    case "monthly":
      frequencyDays = 30;
      break;
  }

  // Create and sign transaction via SDK
  const tx = await sdk.createSubscription({
    amount: amountInSmallestUnits,
    recipient: new PublicKey(subscription.recipient),
    frequencyDays,
    mint: USDC_MINT,
    gateway: GATEWAY_ADDRESS,
  });

  const signedTx = await wallet.signTransaction(tx);
  const txid = await sdk.rpc.sendTransaction(signedTx);
  await sdk.rpc.confirmTransaction(txid);

  return { txid, status: "confirmed" };
}
```

### Form Component Integration (`apps/checkout/src/components/checkout-form.tsx`)

```tsx
import { createSubscription, type Subscription } from "@/lib/tributary";
import { Tributary } from "@tributary-so/sdk";

function CheckoutForm() {
  const [form, setForm] = useState({
    recipient: "",
    amount: 10,
    frequency: "monthly" as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sdk = new Tributary(wallet.adapter);
    const result = await createSubscription(sdk, wallet, form);

    if (result.status === "confirmed") {
      // Show success, redirect, etc.
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Input fields: recipient, amount, frequency */}
      {/* Submit button */}
    </form>
  );
}
```

### On-Chain Payment Flow

1. **UserPayment PDA** `["user_payment", owner, mint]`

   - Created per user/mint combination
   - Tracks total paid, policy count, next payment time

2. **PaymentPolicy PDA** `["payment_policy", user_payment, policy_id]`

   - Individual subscription with amount, frequency, recipient
   - Has status: active/paused/cancelled

3. **PaymentsDelegate PDA** `["payments_delegate", user_payment, recipient, gateway]`

   - Stores token delegation approval
   - Required before `execute_payment` can succeed

4. **Execution**
   - Gateway signer calls `execute_payment` (permissionless)
   - Checks `next_payment_due` timestamp
   - Transfers amount minus protocol fee (100 bps = 1%)
   - Splits gateway fee between gateway and protocol

### Shared Configuration

Both checkout and app use identical on-chain addresses:

| Constant          | Value                                          | Purpose                      |
| ----------------- | ---------------------------------------------- | ---------------------------- |
| `USDC_MINT`       | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | USDC token on Solana         |
| `GATEWAY_ADDRESS` | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`  | Tributary gateway authority  |
| `PROGRAM_ID`      | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`  | Tributary program identifier |

## Environment Variables

### Required

| Variable         | Description          | Example                                       |
| ---------------- | -------------------- | --------------------------------------------- |
| `SOLANA_RPC_URL` | Solana RPC endpoint  | `https://api.mainnet-beta.solana.com`         |
| `PROGRAM_ID`     | Tributary program ID | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ` |

### Optional

| Variable              | Description           | Default                    |
| --------------------- | --------------------- | -------------------------- |
| `ANCHOR_WALLET`       | Path to Solana wallet | `~/.config/solana/id.json` |
| `ANCHOR_PROVIDER_URL` | Anchor provider URL   | Localnet URL               |
| `REDIS_URL`           | Redis for caching     | -                          |

## Available Scripts

| Command                      | Description                            |
| ---------------------------- | -------------------------------------- |
| `pnpm install`               | Install all dependencies               |
| `pnpm run lint`              | Run linting across all packages        |
| `pnpm run lint:fix`          | Auto-fix linting issues                |
| `anchor build`               | Build Solana program                   |
| `anchor test`                | Run smart contract tests               |
| `anchor deploy`              | Deploy program to Solana               |
| `cd app && pnpm run dev`     | Start React development server         |
| `cd landing && pnpm run dev` | Start landing page development server  |
| `cd sdk && pnpm run build`   | Build TypeScript SDK                   |
| `cd tests && npx jest`       | Run integration tests                  |
| `make prep`                  | Setup Solana toolchain (Anchor 0.31.0) |

## Testing

### Smart Contract Tests

```bash
# Run all Anchor tests
anchor test

# Run with verbose output
anchor test -- --nocapture
```

### SDK Tests

```bash
# Run SDK tests
cd tests
npx jest

# Run with coverage
npx jest --coverage
```

### Integration Tests

The test suite covers the complete payment flow:

- Program initialization
- User payment creation
- Gateway setup
- Policy creation (all three types)
- Delegate approval
- Payment execution with fee distribution verification

## Deployment

### Smart Contract Deployment

```bash
# Setup Solana CLI
make prep

# Build program
anchor build

# Deploy to devnet
make devnet_deploy

# Deploy to mainnet
make mainnet_deploy
```

### SDK Packages

SDKs are automatically published via semantic-release when changes are pushed to main.

### Docker Deployment

```bash
# Build scheduler image
docker build -t tributary-scheduler ./scheduler

# Run with environment variables
docker run -e DATABASE_URL=... -e SOLANA_RPC_URL=... tributary-scheduler
```

### Frontend Deployment

The app and landing page deploy automatically via GitHub Actions to Vercel/Netlify.

## SDK Usage

### Basic Subscription Setup

```typescript
import { Tributary } from "@tributary-so/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const sdk = new Tributary(
  "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ",
  connection
);

// Create subscription instructions
const instructions = await sdk.createSubscriptionInstruction(
  tokenMint,
  recipient,
  gateway,
  amount,
  false, // auto_renew
  null, // max_renewals
  PaymentFrequency.Monthly,
  memo,
  startTime,
  approvalAmount,
  true // execute_immediately
);
```

### React Components

```tsx
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";

<SubscriptionButton
  amount={new BN("10000000")} // 10 USDC (6 decimals)
  token={new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")} // USDC
  recipient={recipientWallet}
  gateway={gatewayAddress}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Monthly donation"
  label="Subscribe for $10/month"
/>;
```

### x402 HTTP Payments

```typescript
import { createX402Middleware } from "@tributary-so/x402";

const middleware = createX402Middleware({
  scheme: "deferred",
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  amount: 100,
  recipient: process.env.RECIPIENT_WALLET!,
  gateway: process.env.GATEWAY!,
  tokenMint: process.env.TOKEN_MINT!,
  paymentFrequency: "monthly",
  jwtSecret: process.env.JWT_SECRET!,
  sdk,
  connection,
});

// Apply to protected routes
app.use("/api/premium", middleware);
```

## CLI Manager

The CLI provides full program management capabilities:

```bash
# Build CLI
cd cli
pnpm run build

# Run manager
pnpm run manager

# Available commands:
# - Create gateways
# - Setup payment policies
# - Execute payments
# - Query program state
# - PDA utilities
```

## Documentation

### Building Docs Locally

```bash
cd docs
pip install -r requirements.txt
mkdocs serve
```

Open [http://localhost:8000](http://localhost:8000) to view the documentation.

### Documentation Structure

- **Protocol**: Architecture, smart contracts, security
- **SDKs**: Integration guides for all SDK packages
- **Use Cases**: Business applications and examples
- **Developer Guide**: Quickstarts and advanced usage
- **x402**: HTTP 402 payment protocol implementation

## Security

- **Audit**: _Pending_
- **Non-custodial**: Funds remain in user wallets
- **Delegation-based**: SPL token delegation for automation
- **Emergency pause**: Program can be paused in emergencies
- **Access control**: Proper authority verification on all operations

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run the test suite: `anchor test && cd tests && npx jest`
5. Ensure linting passes: `pnpm run lint`
6. Commit with conventional commits
7. Push and create a pull request

### Development Workflow

- Use `pnpm` for package management
- Follow conventional commit format for releases
- All PRs require tests and linting to pass
- Smart contract changes require Anchor tests
- SDK changes require TypeScript compilation and tests

## Troubleshooting

### Common Issues

**Anchor build fails:**

```bash
# Clear Anchor cache
rm -rf ~/.anchor/
anchor clean
anchor build
```

**SDK build fails:**

```bash
# Clear node_modules and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm --filter @tributary-so/sdk build
```

**Program deployment fails:**

```bash
# Check Solana balance
solana balance

# Ensure correct keypair
solana config get
```

**Tests fail:**

```bash
# Restart local validator
anchor localnet stop
anchor localnet start
anchor test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Community & Support

- **Website**: [tributary.so](https://tributary.so)
- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **GitHub Issues**: [github.com/tributary-so/tributary/issues](https://github.com/tributary-so/tributary/issues)
- **Discord**: Community discussions and support
- **Twitter**: [@tributary_so](https://twitter.com/tributary_so)

## Roadmap

- **Q1 2025**: Mainnet launch, design partner program
- **Q2 2025**: Ecosystem growth, wallet integrations
- **Q3 2025**: Enterprise features, cross-chain R&D
- **Q4 2025**: Market leadership, advanced analytics
- **2026**: Global expansion, multi-chain support</content>
  <parameter name="filePath">README.md
