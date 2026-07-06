---
# tributary-nepb
title: 'API: gateway-authority auth (wallet-sign challenge → JWT + middleware)'
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:10:51Z
updated_at: 2026-07-05T08:36:27Z
parent: tributary-6egw
---

## What

Add gateway-authority authentication to `apps/api` so merchant endpoints can expose commercial data safely. Reuse existing JWT infra (`signingKeys` table, `services/jwks`, `tokens/issue`, JWKS endpoint). **No platform DB of authorities** — authority is read from the on-chain `PaymentGateway` account.

## Deliverables

- New router mounted at `/v1/gateway/:gateway/auth/*`:
  - `POST /challenge` → mints a short-TTL nonce (in-memory or Redis; ~60s), returns `{ nonce, gateway, expiresAt }`.
  - `POST /verify` → body `{ signerPubkey, signature }` where signature is over the nonce message. Server: (a) verifies the Solana signature, (b) fetches the on-chain `PaymentGateway(account.authority)` via the existing solana service and asserts `account.authority === signerPubkey`, (c) issues a JWT via `tokens/issue` with claim `{ gateway: <pubkey>, sub: <authority> }`, short TTL (e.g. 15 min), returns `{ token, expiresIn }`.
- New middleware `requireGatewayAuth`: verifies the `Authorization: Bearer` JWT via JWKS, extracts the `gateway` claim, rejects with 403 if `claim.gateway !== req.params.gateway`. Attaches `req.gatewayAuth = { gateway, authority }`.
- Rate-limit `/challenge` and `/verify` (reuse existing `rateLimit` middleware) to blunt signature-spam.

## Acceptance

- [ ] `POST /challenge` returns a nonce with expiry.
- [ ] `POST /verify` with a valid signature from the on-chain authority returns a JWT whose `gateway` claim matches the path param.
- [ ] `verify` rejects a signature from a wallet that is NOT the gateway's on-chain authority (403).
- [ ] `verify` rejects an expired nonce (410).
- [ ] `requireGatewayAuth` rejects a JWT whose `gateway` claim differs from the path `:gateway` (403).
- [ ] `requireGatewayAuth` accepts a valid JWT and populates `req.gatewayAuth`.
- [ ] JWKS rotation still validates tokens issued before rotation (grace period already handled by `services/jwks`).
- [ ] OpenAPI annotations added (`@openapi` blocks matching existing style in `routes/jwks.ts`).

## Files

- new: `apps/api/src/routes/gateway-auth.ts`
- new: `apps/api/src/middleware/gatewayAuth.ts`
- maybe extend: `apps/api/src/services/solana.ts` (helper to read a `PaymentGateway` account's authority) if not already present.
- wire into `apps/api/src/routes/index.ts`.

## Notes

- Nonce store: in-memory Map is fine for v1 (single instance). Document the ceiling; swap to Redis when scaling. (ponytail: defer)
- The signature payload must be a UTF-8 message the wallet UIs display clearly (e.g. `"Tributary gateway auth <nonce>"`) — coordinate the exact message format with the apps/app auth helper (feature 3).

## Implementation notes

- Nonces: in-memory Map (single-instance ceiling; swap for redis when API scales horizontally)
- JWT: reuses JWKS signing key + existing `verifyToken`; gateway claim discriminates
- On-chain authority check via raw account slice (discriminator 8 + authority 32) — no anchor dep needed
- Ed25519 verify uses Node built-in crypto (no tweetnacl dep)

## Summary of Changes

- apps/api/src/services/gateway-auth.ts — challenge/nonce store + verify + JWT issue
- apps/api/src/middleware/gateway-auth.ts — requireGatewayAuth middleware (gateway claim match)
- Ed25519 verify via Node built-in crypto (no tweetnacl dep)
- Reuses JWKS signing key + verifyToken path (single audience)
