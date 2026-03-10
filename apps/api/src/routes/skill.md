# Tributary Subscription Skill

This skill sets up a recurring subscription payment using Tributary. **Important**: This should only be called once per subscription.

## What You're Subscribing To

${itemsDescription}

### Payment Configuration

| Parameter             | Value                   |
| --------------------- | ----------------------- |
| **Token Mint**        | `${tokenMint}`          |
| **Token Decimals**    | ${decimals}             |
| **Amount**            | ${displayAmount} tokens |
| **Amount (Integer)**  | ${amount}               |
| **Payment Frequency** | ${frequencyDisplay}     |
| **Auto-Renew**        | ${autoRenew}            |
| **Max Renewals**      | ${maxRenewals}          |
| **Tracking ID**       | `${trackingId}`         |
| **Gateway**           | `${gateway}`            |

## How to Pay

### Prerequisites

1. **Install CLI**

```bash
# No installation needed - use npx directly
npx @tributary-so/cli@latest --help
```

1. **Funded Solana Account**
   - Option A: Use existing keypair file
   - Option B: Create new wallet and fund it

### Step 1: Create or Load Wallet

**Create new wallet:**

```bash
npx @tributary-so/cli@latest wallet create keypair.json
```

**Check wallet address:**

```bash
npx @tributary-so/cli@latest -k keypair.json wallet address
```

**Fund the wallet** with:

- At least ${displayAmount} tokens (${tokenMint})
- At least 0.01 SOL for transaction fees

### Step 2: Create Subscription

```bash
npx @tributary-so/cli@latest -k keypair.json subscription create \
  --token-mint ${tokenMint} \
  --recipient ${recipient} \
  --gateway ${gateway} \
  --amount ${amount} \
  --frequency ${frequencyDisplay} \
  --auto-renew ${autoRenew} \
  ${maxRenewals ? `--max-renewals ${maxRenewals}` : ""} \
  --memo ${trackingId}
```

### Alternative: One-Liner

If you already have a funded keypair:

```bash
npx @tributary-so/cli@latest -k keypair.json subscription create \
  --token-mint ${tokenMint} \
  --recipient ${recipient} \
  --gateway ${gateway} \
  --amount ${amount} \
  --frequency ${frequencyDisplay} \
  --memo ${trackingId}
```

## Complete Implementation Script

Save as `setup-subscription.sh`:

```bash
#!/bin/bash

KEYPAIR="keypair.json"
TOKEN_MINT="${tokenMint}"
RECIPIENT="${recipient}"
GATEWAY="${gateway}"
AMOUNT="${amount}"
FREQUENCY="${frequencyDisplay}"
TRACKING_ID="${trackingId}"
AUTO_RENEW="${autoRenew}"
${maxRenewals ? `MAX_RENEWALS="${maxRenewals}"` : "# MAX_RENEWALS not set"}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Tributary Subscription Setup"
echo "========================================"

# Check if keypair exists
if [ ! -f "$KEYPAIR" ]; then
    echo -e "${GREEN}Creating new wallet...${NC}"
    npx @tributary-so/cli@latest wallet create "$KEYPAIR"
    echo ""
    echo -e "${RED}Please fund this wallet with:${NC}"
    echo "  - At least ${displayAmount} tokens ($TOKEN_MINT)"
    echo "  - At least 0.01 SOL for fees"
    echo ""
    echo "Then run this script again."
    exit 0
fi

# Show wallet address
echo -e "${GREEN}Using wallet:${NC}"
WALLET_ADDRESS=$(npx @tributary-so/cli@latest -k "$KEYPAIR" wallet address)
echo "  $WALLET_ADDRESS"
echo ""

# Create subscription
echo -e "${GREEN}Creating subscription...${NC}"
echo "  Amount: ${displayAmount} tokens"
echo "  Frequency: $FREQUENCY"
echo "  Tracking ID: $TRACKING_ID"
echo ""

SUBSCRIPTION_CMD="npx @tributary-so/cli@latest -k \"$KEYPAIR\" subscription create \
  --token-mint \"$TOKEN_MINT\" \
  --recipient \"$RECIPIENT\" \
  --gateway \"$GATEWAY\" \
  --amount \"$AMOUNT\" \
  --frequency \"$FREQUENCY\" \
  --auto-renew \"$AUTO_RENEW\" \
  --memo \"$TRACKING_ID\""

${maxRenewals ? `SUBSCRIPTION_CMD="$SUBSCRIPTION_CMD --max-renewals \"$MAX_RENEWALS\""` : ""}

eval $SUBSCRIPTION_CMD

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo -e "${GREEN}  Subscription Active!${NC}"
    echo "========================================"
    echo "  Tracking ID: $TRACKING_ID"
    echo "  Service Start: Immediate"
else
    echo ""
    echo -e "${RED}Subscription creation failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check wallet has sufficient tokens and SOL"
    echo "  2. Verify network connectivity"
    echo "  3. Try again in a few minutes"
    exit 1
fi
```

## Managing Your Subscription

### View subscription status

```bash
npx @tributary-so/cli@latest -k keypair.json subscription list
```

### Pause subscription

```bash
npx @tributary-so/cli@latest -k keypair.json subscription pause \
  --token-mint ${tokenMint} \
  --policy-id <POLICY_ID>
```

### Resume subscription

```bash
npx @tributary-so/cli@latest -k keypair.json subscription resume \
  --token-mint ${tokenMint} \
  --policy-id <POLICY_ID>
```

### Cancel subscription

```bash
npx @tributary-so/cli@latest -k keypair.json subscription delete \
  --token-mint ${tokenMint} \
  --policy-id <POLICY_ID>
```

## Troubleshooting

| Error              | Solution                             |
| ------------------ | ------------------------------------ |
| Insufficient funds | Add more tokens/SOL to wallet        |
| Invalid token mint | Verify token mint address            |
| Gateway not found  | Contact support for correct gateway  |
| Transaction failed | Wait and retry, check network status |

## Next Steps

1. Ensure wallet has sufficient balance
2. Run the subscription create command
3. Save the transaction signature
4. Access your subscription service immediately after confirmation

---

Powered by Tributary | Recurring Payments on Solana
