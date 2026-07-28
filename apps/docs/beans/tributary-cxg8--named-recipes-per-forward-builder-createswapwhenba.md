---
# tributary-cxg8
title: Named recipes per forward builder (createSwapWhenBalanceLow)
status: completed
type: feature
priority: high
created_at: 2026-07-24T10:34:04Z
updated_at: 2026-07-24T12:20:34Z
parent: tributary-69jm
---

Add createSwapWhenBalanceLow() to each forward-builder file in packages/forward-builders/src/. Produces complete create bundle (policyType + memo + recipient + forwardConfig + pre/post spec+init) + fire-time ForwardBuilder. Composes tier-1 (forward config+builder) + tier-2 (balanceCheck) + tier-3 (composablePolicyRecipe). One per forward program: meteora-dlmm.ts, raydium-clmm.ts, raydium-cpmm.ts.
