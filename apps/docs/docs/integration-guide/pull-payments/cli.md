# Developer Tools

Tributary provides a complete CLI for protocol management, along with testing utilities and deployment scripts.

## CLI (`@tributary-so/cli`)

A command-line interface for managing Tributary recurring payments on Solana.

### Installation

```bash
# From source
cd apps/cli
pnpm install
pnpm run build

# Global installation
npm link
```

### Global Options

All commands require these options:

| Option                       | Description               | Example                               |
| ---------------------------- | ------------------------- | ------------------------------------- |
| `-c, --connection-url <url>` | Solana RPC connection URL | `https://api.mainnet-beta.solana.com` |
| `-k, --keypath <path>`       | Path to keypair JSON file | `~/.config/solana/id.json`            |

### Program Administration

#### Initialize Program

```bash
tributary-cli -c https://api.devnet.solana.com -k ~/.config/solana/id.json \
  initialize -a [ADMIN_PUBKEY]
```

### Payment Gateway Management

#### Create Gateway

```bash
tributary-cli -c https://api.devnet.solana.com -k ~/.config/solana/id.json \
  create-gateway \
  -a [AUTHORITY_PUBKEY] \
  -f 500 \
  -r [FEE_RECIPIENT_PUBKEY] \
  -n "My Gateway" \
  -u "https://mygateway.com"
```

| Option | Description                  |
| ------ | ---------------------------- |
| `-a`   | Gateway authority public key |
| `-f`   | Gateway fee in basis points  |
| `-r`   | Fee recipient public key     |
| `-n`   | Gateway name                 |
| `-u`   | Gateway URL                  |

#### Delete Gateway

```bash
tributary-cli delete-gateway -a [AUTHORITY_PUBKEY]
```

#### Update Gateway Settings

```bash
# Change signer
tributary-cli change-gateway-signer -a [AUTHORITY_PUBKEY] -s [NEW_SIGNER_PUBKEY]

# Change fee recipient
tributary-cli change-gateway-fee-recipient -a [AUTHORITY_PUBKEY] -r [NEW_FEE_RECIPIENT_PUBKEY]

# Change fee basis points
tributary-cli change-gateway-fee-bps -a [AUTHORITY_PUBKEY] -f 750
```

#### Referral Settings

```bash
tributary-cli update-gateway-referral-settings \
  -a [AUTHORITY_PUBKEY] \
  -f 1 \
  -l 500 \
  -t "100,50,25"
```

| Option | Description                              |
| ------ | ---------------------------------------- |
| `-f`   | Feature flags (bit 0 = referral enabled) |
| `-l`   | Referral allocation in basis points      |
| `-t`   | Comma-separated tier BPS (L1,L2,L3)      |

### Subscription Management

#### Create User Payment Account

```bash
tributary-cli create-user-payment -t [TOKEN_MINT_PUBKEY]
```

#### Create Subscription

```bash
tributary-cli create-subscription \
  -t [TOKEN_MINT_PUBKEY] \
  -r [RECIPIENT_PUBKEY] \
  -g [GATEWAY_PUBKEY] \
  -a 1000000 \
  -m "Monthly subscription" \
  --auto-renew \
  --max-renewals 12 \
  -f monthly \
  --execute-immediately
```

| Option                  | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `-t, --token-mint`      | Token mint public key (required)                                             |
| `-r, --recipient`       | Payment recipient public key (required)                                      |
| `-g, --gateway`         | Payment gateway public key (required)                                        |
| `-a, --amount`          | Payment amount in token base units (required)                                |
| `-m, --memo`            | Payment memo (default: "")                                                   |
| `--auto-renew`          | Enable auto-renewal (default: true)                                          |
| `--max-renewals`        | Maximum number of renewals                                                   |
| `-f, --frequency`       | Payment frequency: daily, weekly, monthly, quarterly, semiAnnually, annually |
| `--start-time`          | Start time as Unix timestamp                                                 |
| `--execute-immediately` | Execute first payment immediately                                            |

### Payment Execution

```bash
tributary-cli execute-payment -u [USER_PAYMENT_PDA]
```

### Inspection Commands

```bash
# List all gateways
tributary-cli list-gateways

# List all user payments
tributary-cli list-user-payments

# List policies by owner
tributary-cli list-policies-by-owner -o [OWNER_PUBKEY]

# List all payment policies
tributary-cli list-payment-policies
```

### PDA Utilities

```bash
# Get program config PDA
tributary-cli get-config-pda

# Get gateway PDA
tributary-cli get-gateway-pda -a [AUTHORITY_PUBKEY]

# Get user payment PDA
tributary-cli get-user-payment-pda -u [USER_PUBKEY] -t [TOKEN_MINT_PUBKEY]

# Get payment policy PDA
tributary-cli get-payment-policy-pda -u [USER_PAYMENT_PUBKEY] -p 1

# Get payments delegate PDA
tributary-cli get-payments-delegate-pda
```

## Environment Variables

```bash
# Solana CLI configuration
export SOLANA_RPC_URL="https://api.devnet.solana.com"

# Default keypair path
export SOLANA_KEYPAIR_PATH="~/.config/solana/id.json"
```

## Troubleshooting

### Error: "Error reading keypair"

- Ensure keypair file exists at specified path
- Verify JSON format (array of numbers)

### Error: "Transaction simulation failed"

- Check wallet has sufficient SOL for fees
- Verify account ownership and permissions
- Ensure program is properly initialized

### Error: "Account not found"

- Confirm PDAs are correct using PDA utility commands
- Check prerequisite accounts exist
