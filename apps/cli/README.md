# @tributary-so/cli

A command-line interface for managing Tributary recurring payments on Solana. This CLI provides comprehensive tools for creating payment gateways, managing subscriptions, executing payments, and administering the Tributary protocol.

## Overview

Tributary is an automated recurring payments system built on Solana that provides Web2 subscription UX with Web3 transparency. The CLI serves as the primary interface for:

- **Payment Gateway Management**: Create and configure payment gateways with custom fees and settings
- **Subscription Management**: Set up recurring payment policies with flexible scheduling
- **Payment Execution**: Process pending payments automatically or on-demand
- **Protocol Administration**: Initialize and manage the Tributary program
- **PDA Utilities**: Generate and inspect Program Derived Addresses for debugging

## Tech Stack

- **Language**: TypeScript (ES2020 target)
- **Runtime**: Node.js
- **CLI Framework**: Commander.js
- **Blockchain**: Solana Web3.js
- **Smart Contracts**: Anchor Framework
- **Build Tool**: TypeScript Compiler
- **Linting**: ESLint with React hooks and refresh plugins
- **Formatting**: Prettier

## Prerequisites

- Node.js 20 or higher
- A Solana RPC endpoint (mainnet-beta, devnet, or local validator)
- Solana CLI tools (for keypair management)
- Access to a funded Solana wallet

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/your-org/tributary.git
cd tributary

# Install dependencies for the CLI package
cd cli
pnpm install

# Build the CLI
pnpm run build
```

### Global Installation

```bash
# Build and link globally
cd cli
pnpm run build
npm link
```

## Quick Start

1. **Set up your environment:**

```bash
# Create a keypair for testing
solana-keygen new --outfile ~/.config/solana/id.json

# Fund your wallet on devnet
solana airdrop 2 ~/.config/solana/id.json --url https://api.devnet.solana.com
```

2. **Initialize the program (admin only):**

```bash
tributary-cli -c https://api.devnet.solana.com -k ~/.config/solana/id.json \
  initialize -a [ADMIN_PUBKEY]
```

3. **Create a payment gateway:**

```bash
tributary-cli -c https://api.devnet.solana.com -k ~/.config/solana/id.json \
  create-gateway \
  -a [AUTHORITY_PUBKEY] \
  -f 500 \
  -r [FEE_RECIPIENT_PUBKEY] \
  -n "My Gateway" \
  -u "https://mygateway.com"
```

4. **Create a subscription:**

```bash
tributary-cli -c https://api.devnet.solana.com -k ~/.config/solana/id.json \
  create-subscription \
  -t [TOKEN_MINT_PUBKEY] \
  -r [RECIPIENT_PUBKEY] \
  -g [GATEWAY_PUBKEY] \
  -a 1000000 \
  -m "Monthly subscription"
```

## Global Options

All commands require these global options:

| Option                       | Description               | Example                               |
| ---------------------------- | ------------------------- | ------------------------------------- |
| `-c, --connection-url <url>` | Solana RPC connection URL | `https://api.mainnet-beta.solana.com` |
| `-k, --keypath <path>`       | Path to keypair JSON file | `~/.config/solana/id.json`            |

## Commands

### Program Administration

#### `initialize`

Initialize the Tributary program with admin configuration.

```bash
tributary-cli initialize -a [ADMIN_PUBKEY]
```

**Options:**

- `-a, --admin <pubkey>`: Admin public key (required)

### Payment Gateway Management

#### `create-gateway`

Create a new payment gateway with custom settings.

```bash
tributary-cli create-gateway \
  -a [AUTHORITY_PUBKEY] \
  -f 500 \
  -r [FEE_RECIPIENT_PUBKEY] \
  -n "My Gateway" \
  -u "https://mygateway.com" \
  [--admin-keypath ~/.config/solana/admin-keypair.json]
```

**Options:**

- `-a, --authority <pubkey>`: Gateway authority public key (required)
- `-f, --fee-bps <number>`: Gateway fee in basis points (required)
- `-r, --fee-recipient <pubkey>`: Fee recipient public key (required)
- `-n, --name <string>`: Gateway name (required)
- `-u, --url <string>`: Gateway URL (required)
- `--admin-keypath <path>`: Admin keypair path (defaults to main keypath)

#### `delete-gateway`

Delete an existing payment gateway.

```bash
tributary-cli delete-gateway -a [AUTHORITY_PUBKEY]
```

#### `change-gateway-signer`

Update the signer for a payment gateway.

```bash
tributary-cli change-gateway-signer \
  -a [AUTHORITY_PUBKEY] \
  -s [NEW_SIGNER_PUBKEY]
```

#### `change-gateway-fee-recipient`

Update the fee recipient for a payment gateway.

```bash
tributary-cli change-gateway-fee-recipient \
  -a [AUTHORITY_PUBKEY] \
  -r [NEW_FEE_RECIPIENT_PUBKEY]
```

#### `change-gateway-fee-bps`

Update the gateway fee in basis points.

```bash
tributary-cli change-gateway-fee-bps \
  -a [AUTHORITY_PUBKEY] \
  -f 750
```

#### `update-gateway-referral-settings`

Configure referral program settings.

```bash
tributary-cli update-gateway-referral-settings \
  -a [AUTHORITY_PUBKEY] \
  -f 1 \
  -l 500 \
  -t "100,50,25"
```

**Options:**

- `-f, --feature-flags <number>`: Feature flags (bit 0 = referral enabled)
- `-l, --referral-allocation-bps <number>`: Referral allocation in basis points
- `-t, --referral-tiers-bps <string>`: Comma-separated tier BPS (L1,L2,L3)

#### `update-gateway-protocol-fee`

Update custom protocol fee settings (admin only).

```bash
tributary-cli update-gateway-protocol-fee \
  -a [AUTHORITY_PUBKEY] \
  -u true \
  -f 150 \
  --admin-keypath ~/.config/solana/admin-keypair.json
```

### Subscription Management

#### `create-user-payment`

Create a user payment account for a specific token.

```bash
tributary-cli create-user-payment -t [TOKEN_MINT_PUBKEY]
```

#### `create-subscription`

Create a recurring payment subscription.

```bash
tributary-cli create-subscription \
  -t [TOKEN_MINT_PUBKEY] \
  -r [RECIPIENT_PUBKEY] \
  -g [GATEWAY_PUBKEY] \
  -a 1000000 \
  -m "Monthly subscription" \
  [--auto-renew] \
  [--max-renewals 12] \
  [-f monthly] \
  [--start-time 1704067200] \
  [--execute-immediately]
```

**Options:**

- `-t, --token-mint <pubkey>`: Token mint public key (required)
- `-r, --recipient <pubkey>`: Payment recipient public key (required)
- `-g, --gateway <pubkey>`: Payment gateway public key (required)
- `-a, --amount <number>`: Payment amount in token base units (required)
- `-m, --memo <string>`: Payment memo (default: "")
- `--auto-renew`: Enable auto-renewal (default: true)
- `--max-renewals <number>`: Maximum number of renewals
- `-f, --frequency <string>`: Payment frequency (default: "monthly")
  - Options: `daily`, `weekly`, `monthly`, `quarterly`, `semiAnnually`, `annually`
- `--start-time <number>`: Start time as Unix timestamp
- `--execute-immediately`: Execute first payment immediately

### Payment Execution

#### `execute-payment`

Execute a pending payment for a user payment account.

```bash
tributary-cli execute-payment -u [USER_PAYMENT_PDA]
```

**Options:**

- `-u, --user-payment <pubkey>`: User payment account public key (required)

### Inspection & Utilities

#### `list-gateways`

List all payment gateways.

```bash
tributary-cli list-gateways
```

#### `list-user-payments`

List all user payment accounts.

```bash
tributary-cli list-user-payments
```

#### `list-policies-by-owner`

List all payment policies for a specific owner.

```bash
tributary-cli list-policies-by-owner -o [OWNER_PUBKEY]
```

#### `list-payment-policies`

List all payment policies grouped by user payment.

```bash
tributary-cli list-payment-policies
```

### PDA Utilities

#### `get-config-pda`

Get the program configuration PDA.

```bash
tributary-cli get-config-pda
```

#### `get-gateway-pda`

Get a gateway PDA for a specific authority.

```bash
tributary-cli get-gateway-pda -a [AUTHORITY_PUBKEY]
```

#### `get-user-payment-pda`

Get a user payment PDA for a user and token mint.

```bash
tributary-cli get-user-payment-pda \
  -u [USER_PUBKEY] \
  -t [TOKEN_MINT_PUBKEY]
```

#### `get-payment-policy-pda`

Get a payment policy PDA for a user payment and policy ID.

```bash
tributary-cli get-payment-policy-pda \
  -u [USER_PAYMENT_PUBKEY] \
  -p 1
```

#### `get-payments-delegate-pda`

Get the payments delegate PDA.

```bash
tributary-cli get-payments-delegate-pda
```

## Development

### Building

```bash
# Build the CLI
pnpm run build

# Build in watch mode
pnpm run dev
```

### Testing

```bash
# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Check formatting
pnpm run format:check

# Run full CI suite
pnpm run ci
```

### Project Structure

```
cli/
├── src/
│   └── index.ts          # Main CLI entry point
├── dist/                 # Compiled JavaScript output
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
├── eslint.config.js      # ESLint configuration
└── README.md            # This file
```

### Key Dependencies

- **`@tributary-so/sdk`**: Tributary SDK for Solana interactions
- **`commander`**: Command-line interface framework
- **`@solana/web3.js`**: Solana Web3 JavaScript API
- **`@coral-xyz/anchor`**: Anchor framework for Solana programs

## Environment Variables

The CLI reads configuration from command-line options rather than environment variables. However, you may want to set these for your shell environment:

```bash
# Solana CLI configuration
export SOLANA_RPC_URL="https://api.devnet.solana.com"

# Default keypair path
export SOLANA_KEYPAIR_PATH="~/.config/solana/id.json"
```

## Error Handling

The CLI provides detailed error messages for common issues:

- **Connection errors**: Verify your RPC URL is accessible
- **Keypair errors**: Ensure your keypair file exists and is properly formatted
- **Insufficient funds**: Check your wallet balance for transaction fees
- **Permission errors**: Verify you have authority over the accounts you're modifying

## Troubleshooting

### Common Issues

**"Error reading keypair"**

- Ensure the keypair file exists at the specified path
- Verify the JSON format is correct (array of numbers)

**"Transaction simulation failed"**

- Check your wallet has sufficient SOL for transaction fees
- Verify account ownership and permissions
- Ensure the program is properly initialized

**"Account not found"**

- Confirm PDAs are correct using the PDA utility commands
- Check that prerequisite accounts (gateways, user payments) exist

### Debug Mode

For additional debugging information, you can inspect transaction signatures and account states using the Solana CLI:

```bash
# Check transaction status
solana confirm [TRANSACTION_SIGNATURE]

# Inspect account data
solana account [ACCOUNT_PUBKEY]
```

## Contributing

1. Follow the established code style (TypeScript strict mode, Prettier formatting)
2. Add comprehensive error handling for new commands
3. Update this README when adding new features
4. Test commands on devnet before mainnet deployment

## License

MIT</content>
<parameter name="filePath">/home/xeroc/projects/Tributary/tributary/cli/README.md
