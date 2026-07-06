# REST API

The Tributary API server exposes a REST interface for querying subscriptions,
payment events, managing webhooks, and issuing JWT tokens. The full endpoint
reference below is generated at build time from our live OpenAPI 3.0 spec.

**Base URL**: `https://api.tributary.so`

---

## Endpoint Reference

The reference is generated from the API server's JSDoc annotations and served
live at `https://api.tributary.so/openapi.yaml`. If the spec is unreachable
the section below will be empty — the API server may be starting up or the
domain is not yet deployed.

[OAD(./openapi.yaml)]

---

## Authentication

The API exposes a mix of public read endpoints and gateway-scoped write
endpoints:

- **Public reads** (e.g. `GET /subscriptions`, `GET /events/*`) require no
  authentication.
- **Gateway writes** (e.g. webhook management) are authorized via the gateway
  signer key.
- **JWT tokens** for checkout sessions are issued via the `/tokens` family —
  see the SDK's `jwt-auth` docs for client-side use.

---

## Asset Catalog (`/v1/assets/*`)

A public, IP-rate-limited (120/min) proxy to the tokens.xyz asset
catalog. The upstream `x-api-key` is injected server-side — never
shipped to the browser. Used by the type-ahead token picker in both
`apps/app` and `apps/showcase-payment-policies` (ADR-0028). Responses
are wrapped in the standard `ApiResponse<T>` envelope.

### `GET /v1/assets/search?q=<query>&limit=<n>`

Search the catalog for assets (stablecoins, LSTs, tokenized equities,
…). Server filters out any result whose primary variant is missing or
whose mint isn't a valid Solana base58 mint.

| Param   | Required | Default | Notes                      |
| ------- | -------- | ------- | -------------------------- |
| `q`     | yes      | —       | Symbol, name, or asset id. |
| `limit` | no       | `20`    | Clamped to `[1, 50]`.      |

**Failure stance:** on upstream error, returns `200` with `results: []`
(empty state, not error state). Redis-cached per query for 60s.

```bash
curl 'https://api.tributary.so/v1/assets/search?q=usdc&limit=5'
```

```json
{
  "success": true,
  "data": {
    "query": "usdc",
    "results": [
      {
        "assetId": "usd",
        "symbol": "USDC",
        "name": "USD Coin",
        "category": "stablecoin",
        "imageUrl": null,
        "primaryVariant": {
          "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          "decimals": 6,
          "kind": "native",
          "trustTier": "tier1"
        }
      }
    ]
  },
  "timestamp": 1783070812696
}
```

### `GET /v1/assets/resolve?mint=<base58>`

Resolve a single Solana mint to its asset metadata.

| Param  | Required | Notes                            |
| ------ | -------- | -------------------------------- |
| `mint` | yes      | Solana base58 mint, 32-44 chars. |

**Failure stance:** on upstream error, falls back to the baked-in
`MINT_OVERRIDES` map (USDC, SOL, USDT, mSOL, devnet USDC) so account
balances never render as truncated mints. Returns `404` only when the
mint is unknown to upstream **and** absent from the fallback map.
Redis-cached per mint for 10min.

```bash
curl 'https://api.tributary.so/v1/assets/resolve?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
```

```json
{
  "success": true,
  "data": {
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "assetId": "usd",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "imageUrl": null,
    "category": "stablecoin"
  },
  "timestamp": 1783070812696
}
```

### Client package

Browser consumers should use the shared `@tributary-so/tokens-client`
package (pure fetch client + react-query hooks) rather than hand-rolling
the envelope handling. See ADR-0028 for the design and
`packages/tokens-client/src/` for the API.

---

## SDK Integration

For programmatic access, use the `@tributary-so/sdk` or `@tributary-so/payments`
packages instead of raw HTTP calls where possible. See:

- [TypeScript SDK](../integration-guide/pull-payments/sdk.md)
- [Checkout Links](../integration-guide/pull-payments/checkout.md)
- [JWT Auth](../integration-guide/pull-payments/jwt-auth.md)
