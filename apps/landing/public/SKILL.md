# Tributary CLI - End User Capabilities

## Overview

The Tributary CLI enables end users to manage recurring payments on Solana without needing to configure gateways or manage protocol settings. Users can manage wallets, create subscription policies, execute payments, and track referrals through simple command-line operations.

## Quick Setup

```bash
# Set environment (or use CLI flags)
export SOLANA_API="https://api.devnet.solana.com"
export KEY_PATH="keypair.json"

# Or use CLI flags
npx @tributary-so/cli@latest -c <RPC_URL> -k <KEYPAIR_PATH> <command>
```

---

## Wallet Management

### Create New Wallet

```bash
npx @tributary-so/cli@latest wallet create [output_path]
```

Generate a new Solana keypair. Defaults to `keypair.json` if no path specified.

### Import Existing Wallet

```bash
npx @tributary-so/cli@latest wallet import <path_to_keypair>
```

Import an existing keypair file for use with the CLI.

### Show Wallet Address

```bash
npx @tributary-so/cli@latest wallet address
```

Display your wallet's public key address.

### Check Wallet Balance

```bash
npx @tributary-so/cli@latest wallet balance [--token-mint <mint_address>]
```

Show SOL or token balance for your wallet.

---

## User Payment Accounts

User payment accounts aggregate your payment activity across all subscriptions for a specific token.

### Create User Payment Account

```bash
npx @tributary-so/cli@latest user create --token-mint <mint_pubkey>
```

Initialize a user payment account for a specific token mint. Required before creating any subscriptions with that token.

### List User Payment Accounts

```bash
npx @tributary-so/cli@latest user list
```

Display all user payment accounts with policy counts.

### Show User Payment Details

```bash
npx @tributary-so/cli@latest user show --user-payment <user_payment_pubkey>
```

View detailed information for a specific user payment account including owner, token mint, active policies, and creation date.

---

## Subscription Management

Create and manage recurring payment policies with flexible scheduling options.

### Create Subscription

```bash
npx @tributary-so/cli@latest subscription create \
  --token-mint <mint_pubkey> \
  --recipient <recipient_pubkey> \
  --gateway <gateway_pubkey> \
  --amount <amount_in_base_units> \
  --frequency <frequency> \
  [--memo <payment_memo>] \
  [--auto-renew] \
  [--max-renewals <number>]
```

**Parameters:**

- `--token-mint`: Token mint to use for payments (required)
- `--recipient`: Payment recipient public key (required)
- `--gateway`: Gateway to route payments through (required)
- `--amount`: Payment amount in token base units (required)
- `--frequency`: Payment schedule - `daily`, `weekly`, `monthly`, `quarterly`, `semiAnnually`, `annually` (default: monthly)
- `--memo`: 64-byte payment memo for identification
- `--auto-renew`: Enable automatic renewal (default: true)
- `--max-renewals`: Maximum number of payment renewals

**Example:**

```bash
npx @tributary-so/cli@latest subscription create \
  --token-mint USDC_MINT_ADDRESS \
  --recipient RECIPIENT_ADDRESS \
  --gateway GATEWAY_ADDRESS \
  --amount 10000000 \
  --frequency monthly \
  --memo "Netflix subscription"
```

### List Subscriptions

```bash
npx @tributary-so/cli@latest subscription list [--owner <owner_pubkey>]
```

Display all payment policies. Use `--owner` to filter by a specific wallet address.

### Pause Subscription

```bash
npx @tributary-so/cli@latest subscription pause \
  --token-mint <mint_pubkey> \
  --policy-id <policy_number>
```

Temporarily stop automatic payments for a subscription.

### Resume Subscription

```bash
npx @tributary-so/cli@latest subscription resume \
  --token-mint <mint_pubkey> \
  --policy-id <policy_number>
```

Reactivate a paused subscription to resume automatic payments.

### Delete Subscription

```bash
npx @tributary-so/cli@latest subscription delete \
  --token-mint <mint_pubkey> \
  --policy-id <policy_number>
```

Permanently cancel and remove a payment policy.

---

## Payment Execution

Process pending subscription payments manually if automatic execution is delayed or for immediate fulfillment.

### Execute Payment

```bash
npx @tributary-so/cli@latest payments execute \
  --policy <policy_pubkey> \
  # OR
  --user-payment <user_payment_pubkey>
```

Execute the next pending payment for a policy or user payment account. Payments only execute when the scheduled time has been reached.

---

## Referral System

Participate in gateway referral programs to earn rewards for referring new users.

### Create Referral Account

```bash
npx @tributary-so/cli@latest referral create \
  --gateway <gateway_pubkey> \
  [--code <referral_code>] \
  [--referrer <referrer_pubkey>]
```

Generate a referral code for a specific gateway. Code is auto-generated if not provided. Optionally specify an existing referrer to join their referral chain.

### Show Referral by Code

```bash
npx @tributary-so/cli@latest referral show \
  --gateway <gateway_pubkey> \
  --code <referral_code>
```

Lookup referral account details using a referral code.

### Show Referral by Owner

```bash
npx @tributary-so/cli@latest referral show-owner \
  --gateway <gateway_pubkey> \
  --owner <owner_pubkey>
```

Find a user's referral code using their wallet address.

### View Referral Chain

```bash
npx @tributary-so/cli@latest referral chain \
  --gateway <gateway_pubkey> \
  --owner <owner_pubkey>
```

Display the 3-level referral chain (L1, L2, L3) for a user, showing referrers at each level.

---

## PDA Utilities

Calculate and inspect Program Derived Addresses for debugging and verification.

### Get Program Config PDA

```bash
npx @tributary-so/cli@latest pda config
```

Display the protocol configuration PDA address.

### Get Payments Delegate PDA

```bash
npx @tributary-so/cli@latest pda delegate
```

Display the payments delegate PDA address used for delegated token transfers.

### Get Gateway PDA

```bash
npx @tributary-so/cli@latest pda gateway --authority <authority_pubkey>
```

Calculate the gateway PDA for a given authority address.

### Get User Payment PDA

```bash
npx @tributary-so/cli@latest pda user-payment \
  --user <user_pubkey> \
  --token-mint <mint_pubkey>
```

Calculate the user payment PDA for a specific user and token mint combination.

### Get Payment Policy PDA

```bash
npx @tributary-so/cli@latest pda payment-policy \
  --user-payment <user_payment_pubkey> \
  --policy-id <policy_number>
```

Calculate the payment policy PDA for a given user payment account and policy ID.

---

## Common Workflows

### New User Onboarding

```bash
# 1. Create wallet
npx @tributary-so/cli@latest wallet create my_wallet.json

# 2. Get address and fund
npx @tributary-so/cli@latest wallet address -k my_wallet.json
# Fund address via airdrop or transfer

# 3. Create user payment account for USDC
npx @tributary-so/cli@latest -k my_wallet.json user create --token-mint USDC_MINT

# 4. Create a monthly subscription
npx @tributary-so/cli@latest -k my_wallet.json subscription create \
  --token-mint USDC_MINT \
  --recipient SERVICE_PROVIDER \
  --gateway GATEWAY_ADDRESS \
  --amount 10000000 \
  --frequency monthly \
  --memo "Service subscription"
```

### Manage Existing Subscriptions

```bash
# List all subscriptions
npx @tributary-so/cli@latest subscription list

# Pause a subscription temporarily
npx @tributary-so/cli@latest subscription pause \
  --token-mint USDC_MINT \
  --policy-id 1

# Resume when ready
npx @tributary-so/cli@latest subscription resume \
  --token-mint USDC_MINT \
  --policy-id 1

# Cancel permanently
npx @tributary-so/cli@latest subscription delete \
  --token-mint USDC_MINT \
  --policy-id 1
```

### Manual Payment Execution

```bash
# Execute next payment immediately (if due)
npx @tributary-so/cli@latest payments execute --user-payment USER_PAYMENT_ADDRESS
```

### Join Referral Program

```bash
# Create referral account with a referrer
npx @tributary-so/cli@latest referral create \
  --gateway GATEWAY_ADDRESS \
  --referrer FRIEND_ADDRESS

# View your referral chain
npx @tributary-so/cli@latest referral chain \
  --gateway GATEWAY_ADDRESS \
  --owner YOUR_ADDRESS
```

---

## Notes

- All transactions require sufficient SOL for network fees
- Subscriptions require token delegation approval before first payment execution
- Payment execution checks timestamps - payments only execute when scheduled time is reached
- Policy IDs are sequential per user payment account (0, 1, 2, ...)
- Use `--help` with any command to see all available options
