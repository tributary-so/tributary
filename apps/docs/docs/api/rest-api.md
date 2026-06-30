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

## SDK Integration

For programmatic access, use the `@tributary-so/sdk` or `@tributary-so/payments`
packages instead of raw HTTP calls where possible. See:

- [TypeScript SDK](../integration-guide/pull-payments/sdk.md)
- [Checkout Links](../integration-guide/pull-payments/checkout.md)
- [JWT Auth](../integration-guide/pull-payments/jwt-auth.md)
