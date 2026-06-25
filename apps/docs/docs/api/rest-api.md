# REST API

The Tributary API server exposes a REST interface for querying subscriptions,
payment events, managing webhooks, and issuing JWT tokens. The full OpenAPI
specification is embedded below.

**Base URL**: `https://api.tributary.so`

**Version**: see the spec's `info.version` field

---

## Interactive API Explorer

The complete endpoint reference is rendered from our OpenAPI 3.0 spec, which is
generated from the API server's JSDoc annotations.

```swagger-ui
openapi.yaml
```

> The spec is served live at `https://api.tributary.so/openapi.yaml` and checked
> into the repo at `apps/api/openapi.yaml`.

---

## Authentication

The API exposes a mix of public read endpoints and gateway-scoped write
endpoints:

- **Public reads** (e.g. `GET /subscriptions`, `GET /events/*`) require no
  authentication.
- **Gateway writes** (e.g. webhook management) are authorized via the gateway
  signer key. See `apps/api` for the current auth model.
- **JWT tokens** for checkout sessions are issued via the `/auth/*` family —
  see the SDK's `jwt-auth` docs for client-side use.

---

## SDK Integration

For programmatic access, use the `@tributary-so/sdk` or `@tributary-so/payments`
packages instead of raw HTTP calls where possible. See:

- [Tributary SDK](../integration-guide/pull-payments/sdk.md)
- [Checkout Links](../integration-guide/pull-payments/checkout.md)
- [JWT Auth](../integration-guide/pull-payments/jwt-auth.md)
