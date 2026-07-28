---
name: tributary
description: >-
  Automated recurring payments on Solana using token delegation. Pull-based
  PaymentPolicy (subscription, milestone, pay-as-you-go, one-time, up-to) and
  ComposablePolicy (programmable pull + Lighthouse validation + swap
  forwarding), plus the SDK, CLI, payments, and forward-builder integration
  surface. Load the whole skill; open a reference only for the area in hand.
---

# Tributary

Automated recurring payments on Solana using token delegation. Pull-based: gateways execute payments against pre-approved token delegations. No custodial vaults, no lockups.

## Core Concepts

- **PaymentPolicy** — direct pull payments (subscription, milestone, pay-as-you-go, one-time, up-to)
- **ComposablePolicy** — programmable pull payments with optional validation (Lighthouse) and token forwarding (Meteora DLMM / Raydium CPMM / Raydium CLMM / Orca Whirlpool)
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

## References

This entry point covers the essentials. Open a reference for depth in one area
(progressive disclosure — load only what the task needs):

| Reference | When to load | Path |
| --------- | ------------ | ---- |
| CLI Reference | Authoring commands, PDA utilities, structured-JSON output | [references/cli.md](references/cli.md) |
| SDK Integration | Architecture, package map, the `Tributary` class, integration recipes | [references/sdk.md](references/sdk.md) |
| Composable Policies | Composable anatomy, Lighthouse assertions, `ForwardConfig`, settlement shapes | [references/composables.md](references/composables.md) |
| Composable Recipes | `@tributary-so/forward-builders` recipe layer, `createSwapWhenBalanceLow`, auto-topup flows | [references/composable-recipes.md](references/composable-recipes.md) |

## Packages

| Package                            | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `@tributary-so/cli`                | Command-line interface (oclif)                        |
| `@tributary-so/sdk`                | TypeScript SDK — `Tributary` class                    |
| `@tributary-so/sdk-react`          | React hooks and UI components                         |
| `@tributary-so/sdk-x402`           | x402 / HTTP-402 middleware for paywalled APIs         |
| `@tributary-so/payments`           | Checkout sessions, payment tracking, JWT verification |
| `@tributary-so/forward-builders`   | Concrete `ForwardBuilder` impls (opt-in per swap DEX) |

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
