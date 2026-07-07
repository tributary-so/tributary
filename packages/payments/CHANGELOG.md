# [@tributary-so/payments-v1.10.0-beta.1](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.8...@tributary-so/payments-v1.10.0-beta.1) (2026-07-07)


* ✨ feat(payments): generalize JWT to discriminated PolicyClaim union ([db4e952](https://github.com/tributary-so/tributary/commit/db4e952fbabcdcc6c1c487039471fafd2f154c8a))


### BREAKING CHANGES

* for consumers of `@tributary-so/payments`:
- `TributaryJWTPayload.subscriptions` → `policies`
- `SubscriptionClaim` removed (use `PolicyClaim` / per-variant claims)
Downstream consumers (apps/api token-issuer, sdk-react hooks, apps/checkout
success-page) will be migrated in their own beans (o7du, 0h6a, s545).

Refs: tributary-5pd3

# [@tributary-so/payments-v1.9.8](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.7...@tributary-so/payments-v1.9.8) (2026-06-11)

# [@tributary-so/payments-v1.9.7](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.6...@tributary-so/payments-v1.9.7) (2026-05-19)

# [@tributary-so/payments-v1.9.6](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.5...@tributary-so/payments-v1.9.6) (2026-05-07)

# [@tributary-so/payments-v1.9.5](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.4...@tributary-so/payments-v1.9.5) (2026-05-07)

# [@tributary-so/payments-v1.9.4](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.3...@tributary-so/payments-v1.9.4) (2026-05-07)

# [@tributary-so/payments-v1.9.3](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.2...@tributary-so/payments-v1.9.3) (2026-05-07)

# [@tributary-so/payments-v1.9.2](https://github.com/tributary-so/tributary/compare/@tributary-so/payments-v1.9.1...@tributary-so/payments-v1.9.2) (2026-05-07)
