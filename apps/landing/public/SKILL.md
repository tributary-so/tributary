# Tributary

Automated recurring payments on Solana using token delegation. Pull-based: gateways execute payments against pre-approved token delegations. No custodial vaults, no lockups.

## Core Concepts

- **PaymentPolicy** — direct pull payments (subscription, milestone, pay-as-you-go, one-time, up-to)
- **ComposablePolicy** — programmable pull payments with optional validation (Lighthouse) and token forwarding (Meteora DLMM)
- **PaymentGateway** — routes payments, collects fees, signs execution transactions
- **UserPayment** — per-user-per-mint account tracking policies and delegating token transfers

## Quickstart

```bash
# Install CLI
npx @tributary-so/cli@latest --help

# Set environment
export SOLANA_API="https://api.devnet.solana.com"
export KEY_PATH="keypair.json"

# Create a subscription (end-to-end)
npx @tributary-so/cli@latest wallet create wallet.json
npx @tributary-so/cli@latest -k wallet.json user create --token-mint <USDC_MINT>
npx @tributary-so/cli@latest -k wallet.json subscription create \
  --token-mint <USDC_MINT> \
  --recipient <RECIPIENT> \
  --gateway <GATEWAY> \
  --amount 10000000 \
  --frequency monthly \
  --memo "Pro plan"
```

## Sub-Guides

| Guide                                       | Scope                                                      | URL                               |
| ------------------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| [CLI Reference](SKILL-cli.md)               | All CLI commands, workflows, PDA utilities                 | tributary.so/SKILL-cli.md         |
| [SDK Integration](SKILL-sdk.md)             | Architecture, package relationships, integration recipes   | tributary.so/SKILL-sdk.md         |
| [Composable Policies](SKILL-composables.md) | Composable anatomy, Lighthouse assertions, forward configs | tributary.so/SKILL-composables.md |

## Packages

| Package                   | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `@tributary-so/cli`       | Command-line interface (oclif)                        |
| `@tributary-so/sdk`       | TypeScript SDK — `Tributary` class                    |
| `@tributary-so/sdk-react` | React hooks and UI components                         |
| `@tributary-so/sdk-x402`  | x402 / HTTP-402 middleware for paywalled APIs         |
| `@tributary-so/payments`  | Checkout sessions, payment tracking, JWT verification |

## Program ID

```
TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
```

## Network

Default: Solana devnet. Set `SOLANA_API` to override. All tokens require Token Program or Token-2022 (with extension blocklist — see ADR-0012).

## Further Reading

- [Architecture Decision Records](https://github.com/AnamolyDev/tributary/tree/main/apps/docs/adr)
- [Source Code](https://github.com/AnamolyDev/tributary)
- [Anchor IDL](https://github.com/AnamolyDev/tributary/tree/main/target/idl/tributary.json)
