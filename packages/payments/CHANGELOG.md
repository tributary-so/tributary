# @tributary-so/payments-v1.0.0-beta.1 (2026-07-07)


* ✨ feat(payments): generalize JWT to discriminated PolicyClaim union ([db4e952](https://github.com/tributary-so/tributary/commit/db4e952fbabcdcc6c1c487039471fafd2f154c8a))


### Features

* add custom skill to lando that explains in skill how to use lando ([7d57108](https://github.com/tributary-so/tributary/commit/7d57108533ad0e69fe2fb397496ea9e77dbc6ac9))
* proper payments verifications via payments package ([415fdde](https://github.com/tributary-so/tributary/commit/415fddedfe4773f07a580f5433129c82f7874fb4))


### BREAKING CHANGES

* for consumers of `@tributary-so/payments`:
- `TributaryJWTPayload.subscriptions` → `policies`
- `SubscriptionClaim` removed (use `PolicyClaim` / per-variant claims)
Downstream consumers (apps/api token-issuer, sdk-react hooks, apps/checkout
success-page) will be migrated in their own beans (o7du, 0h6a, s545).

Refs: tributary-5pd3
