---
# tributary-klvi
title: 'L-04: Compute Budget — Complex Payment Execution'
status: todo
type: task
priority: low
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# L-04: Compute Budget — Complex Payment Execution

| Field        | Value                                                     |
| ------------ | --------------------------------------------------------- |
| **Severity** | Low                                                       |
| **Status**   | Open                                                      |
| **Program**  | Tributary (`TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`) |
| **Files**    | `execute_payment.rs`, `execute_composable.rs`, `utils.rs` |

---

## Description

Both `execute_payment` and `execute_composable` perform multiple cross-program invocations (CPIs) to the SPL Token program within a single transaction. When referral rewards are enabled with a full 3-level referral chain, a single `execute_payment` call issues **6 separate `transfer_checked` CPIs**. The composable execution path adds additional CPIs on top of this.

Solana's default compute budget is 200,000 CU (expandable to 1,400,000 via `ComputeBudget::set_compute_unit_limit`). There is no code-level protection or documentation bounding the worst-case compute usage, and the existing test suite never measures actual CU consumption.

---

## Analysis

### CPI Chain in `execute_payment`

Tracing through `execute_payment.rs:117-364` and `utils.rs:248-428`:

| #   | CPI Call                                       | Source Location              | Estimated CU |
| --- | ---------------------------------------------- | ---------------------------- | ------------ |
| 1   | Referral L1: `transfer_checked`                | `utils.rs:406-418`           | ~4,500       |
| 2   | Referral L2: `transfer_checked`                | `utils.rs:406-418`           | ~4,500       |
| 3   | Referral L3: `transfer_checked`                | `utils.rs:406-418`           | ~4,500       |
| 4   | Main transfer to recipient: `transfer_checked` | `execute_payment.rs:290-298` | ~4,500       |
| 5   | Gateway fee: `transfer_checked`                | `execute_payment.rs:301-310` | ~4,500       |
| 6   | Protocol fee: `transfer_checked`               | `execute_payment.rs:313-322` | ~4,500       |

**Additional overhead:**

| Component                                                                | Estimated CU  |
| ------------------------------------------------------------------------ | ------------- |
| Anchor account deserialization (10 accounts)                             | ~15,000       |
| Policy strategy execution + fee calculation                              | ~5,000        |
| `process_referral_rewards`: `parse_remaining_accounts` loop + arithmetic | ~8,000        |
| `calculate_next_payment_due` (monthly with catch-up iterations)          | ~3,000-15,000 |
| State updates + `emit!` event                                            | ~3,000        |
| BPF overhead, logging                                                    | ~5,000        |

**Worst-case `execute_payment` estimate:**

```
Base overhead:           ~36,000 CU
6x transfer_checked CPI: ~27,000 CU
Monthly date catch-up:   ~15,000 CU (MAX_MONTHLY_ITERATIONS=1200 bounded)
                                  but typical is ~3,000 CU
─────────────────────────────────
Total (worst case):      ~78,000 CU
Total (typical):         ~66,000 CU
```

This fits well within the default 200,000 CU budget for `execute_payment`.

### CPI Chain in `execute_composable`

Tracing through `execute_composable.rs:199-571`:

| #   | CPI Call                                            | Source Location                 | Estimated CU              |
| --- | --------------------------------------------------- | ------------------------------- | ------------------------- |
| 1   | Validation CPI: `invoke_signed` to external program | `execute_composable.rs:339-343` | Variable (5,000-100,000+) |
| 2   | Gateway fee: `transfer_checked`                     | `execute_composable.rs:431-441` | ~4,500                    |
| 3   | Protocol fee: `transfer_checked`                    | `execute_composable.rs:443-453` | ~4,500                    |
| 4   | Net input transfer: `transfer_checked`              | `execute_composable.rs:459-468` | ~4,500                    |
| 5   | Forward CPI: `invoke_signed` to `target_program`    | `execute_composable.rs:514-518` | Variable (5,000-200,000+) |

**Key difference:** Composable execution does **not** include referral rewards (the referral path is not present in `execute_composable`). However, it has two unbounded CPIs:

- **Validation CPI** (`execute_composable.rs:263-348`): Calls an arbitrary `validation_program` with arbitrary accounts. Cost is entirely dependent on the external program.
- **Forward CPI** (`execute_composable.rs:471-519`): Calls `forward_config.target_program` with `instruction_data`. This is the primary compute risk — the target program could consume significant CU.

**Worst-case `execute_composable` estimate:**

```
Base overhead:           ~40,000 CU
3x transfer_checked CPI: ~13,500 CU
Validation CPI:          Variable (external program)
Forward CPI:             Variable (external program)
─────────────────────────────────
Without external CPIs:   ~53,500 CU
With uncooperative external: Could exceed 1,400,000 CU
```

### Account Deserialization Cost

Both instruction handlers deserialize a significant number of accounts:

- `execute_payment`: 10 explicit accounts + N remaining accounts (referral chain)
- `execute_composable`: 10 explicit accounts + M remaining accounts (validation + forward)

Each `Account<Box<T>>` deserialization costs ~1,500 CU. With 10+ accounts, this alone consumes ~15,000 CU before any logic executes.

---

## Impact

**Low severity** because:

1. The standard `execute_payment` path (even with full 3-level referral) comfortably fits within the default 200,000 CU budget.
2. The composable path's unbounded CPI is by design — the external programs are user-chosen.

**Operational risks:**

- No existing test measures actual CU consumption, so regressions could go undetected.
- If `calculate_next_payment_due` is called with a Monthly frequency and a `current_due` far in the past, the bounded loop (`MAX_MONTHLY_ITERATIONS = 1200`) could add significant overhead. Each iteration involves `add_months` with full date arithmetic (`utils.rs:91-204`).
- SDK consumers have no guidance on setting `ComputeBudget` instructions.
- The existing test at `tributary.test.ts:564` uses `ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 })` for one specific test but does not log actual usage.

---

## Recommendations

### A. Add Compute Budget Logging to Integration Tests

Add a test helper and dedicated test that measures CU consumption:

```typescript
// Add to tests/tributary.test.ts

import { ComputeBudgetProgram } from "@solana/web3.js";

async function measureComputeUsage(
  connection: any,
  ixs: anchor.web3.TransactionInstruction[],
  signers: Keypair[],
  label: string
): Promise<number> {
  // Add compute unit price 0 so we can read the compute budget
  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_400_000,
  });

  const tx = new Transaction().add(computeIx, ...ixs);
  const sig = await sendAndConfirmTransaction(connection, tx, signers, {
    commitment: "confirmed" as Commitment,
    skipPreflight: true,
  });

  // Get transaction details to extract compute units used
  const txDetails = await connection.getTransaction(sig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const cuUsed = txDetails?.meta?.computeUnitsConsumed ?? -1;
  console.log(`[CU BENCHMARK] ${label}: ${cuUsed} CU`);
  return cuUsed;
}

// Add as a test case in the "Subscription payment policies" describe block:
test("Benchmark: measure compute usage for standard execute_payment", async () => {
  // Create a fresh policy with start_time in the past
  await sdk.updateWallet(new anchor.Wallet(user));
  const amount = new anchor.BN(10000);
  const memo = new Uint8Array(64).fill(0);
  Buffer.from("cu benchmark test").copy(memo);
  const paymentFrequency: PaymentFrequency = {
    custom: { 0: new anchor.BN(3600) },
  };
  const pastTime = Math.floor(Date.now() / 1000) - 7200;

  const createIx = await sdk.getCreateSubscriptionPolicyInstruction(
    tokenMint,
    recipient.publicKey,
    gatewayPDA,
    amount,
    true,
    null,
    paymentFrequency,
    Array.from(memo),
    new anchor.BN(pastTime)
  );
  const createTx = new Transaction().add(createIx);
  await sendAndConfirmTransaction(connection, createTx, [user], {
    commitment: "processed" as Commitment,
  });

  const up = await sdk.getUserPayment(userPaymentPDA);
  const policyId = up!.createdPoliciesCount;
  const [benchPolicyPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_policy"),
      userPaymentPDA.toBuffer(),
      new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    program.programId
  );

  await sdk.updateWallet(new anchor.Wallet(gatewayExecutionSigner));
  const executeIxs = await sdk.executePayment(benchPolicyPDA);
  const cuUsed = await measureComputeUsage(
    connection,
    executeIxs,
    [gatewayExecutionSigner],
    "execute_payment (no referral)"
  );

  // Assert it fits within default budget with margin
  expect(cuUsed).toBeGreaterThan(0);
  expect(cuUsed).toBeLessThan(150_000); // comfortable margin under 200k default
});

// Add in the "Referral program" describe block after the referral execution test:
test("Benchmark: measure compute usage for execute_payment with 3-level referral", async () => {
  // Reuse the existing referral setup from the describe block
  await sdk.updateWallet(new anchor.Wallet(gatewayExecutionSigner));
  const paymentAmount = new anchor.BN(100000);
  const executeIxs = await sdk.executePayment(payerPolicyPDA, paymentAmount);

  const cuUsed = await measureComputeUsage(
    connection,
    executeIxs,
    [gatewayExecutionSigner],
    "execute_payment (3-level referral)"
  );

  expect(cuUsed).toBeGreaterThan(0);
  expect(cuUsed).toBeLessThan(150_000); // should still fit in default budget
});
```

### B. Batch Referral Rewards into Fewer CPIs

Currently, `process_referral_rewards` at `utils.rs:320-322` performs up to 3 separate `transfer_checked` CPIs:

```rust
transfer_referral_reward(&ctx, &token_accounts, level1_referrer, level1_reward)?;
transfer_referral_reward(&ctx, &token_accounts, level2_referrer, level2_reward)?;
transfer_referral_reward(&ctx, &token_accounts, level3_referrer, level3_reward)?;
```

Each CPI incurs ~4,500 CU overhead. An alternative approach: accumulate rewards into a single `transfer_checked` to an intermediate escrow account, then use a single batch CPI to distribute. However, given that the current design fits within budget, this is an optimization — not a necessity. The referral tier count is hardcoded to 3 (`[u16; 3]`), so the CPI count is bounded.

**Recommendation:** Document the fixed 3-CPI referral cost. If referral tiers become configurable in the future, enforce a hard maximum.

### C. Document Maximum Referral Depth and Compute Implications

Add to `AGENTS.md` or inline documentation:

```rust
/// Referral reward distribution performs exactly 3 transfer_checked CPIs
/// (one per tier level). The tier count is fixed at 3 via [u16; 3].
/// Total CPI count for execute_payment with full referral chain:
///   - 3 referral transfers
///   - 1 main transfer
///   - 1 gateway fee transfer
///   - 1 protocol fee transfer
///   = 6 CPIs total
/// Estimated CU: ~66,000-78,000 (well within 200,000 default budget)
```

### D. Add a CU Estimation Helper for SDK Users

```typescript
// Add to packages/sdk/src/index.ts or a new file packages/sdk/src/compute.ts

export interface CUEstimate {
  estimatedCU: number;
  recommendedBudget: number;
  breakdown: {
    baseOverhead: number;
    transferCPIs: number;
    referralCPIs: number;
    validationCPI: number;
    forwardCPI: number;
  };
}

export function estimateComputeUnits(params: {
  hasReferral: boolean;
  referralDepth: number; // 0, 1, 2, or 3
  hasValidation: boolean;
  hasForward: boolean;
  paymentFrequency?: string;
}): CUEstimate {
  const TRANSFER_CPI_CU = 4_500;
  const BASE_OVERHEAD = 36_000;
  const DATE_CALC_MONTHLY_OVERHEAD = 3_000;

  const referralCPIs = params.hasReferral
    ? Math.min(params.referralDepth, 3)
    : 0;
  const transferCPIs = 3; // recipient + gateway_fee + protocol_fee
  const validationCU = params.hasValidation ? 10_000 : 0;
  const forwardCU = params.hasForward ? 15_000 : 0;

  const totalCPIs = transferCPIs + referralCPIs;
  const estimatedCU =
    BASE_OVERHEAD +
    totalCPIs * TRANSFER_CPI_CU +
    validationCU +
    forwardCU +
    DATE_CALC_MONTHLY_OVERHEAD;

  return {
    estimatedCU,
    recommendedBudget: Math.ceil(estimatedCU * 1.5), // 50% safety margin
    breakdown: {
      baseOverhead: BASE_OVERHEAD,
      transferCPIs: transferCPIs * TRANSFER_CPI_CU,
      referralCPIs: referralCPIs * TRANSFER_CPI_CU,
      validationCPI: validationCU,
      forwardCPI: forwardCU,
    },
  };
}
```

---

## Testing Instructions

### Benchmark Compute Usage

1. **Run the existing test suite with CU logging:**

   ```bash
   anchor test -- --runInBand 2>&1 | grep -E "\[CU BENCHMARK\]|compute"
   ```

2. **Add the `measureComputeUsage` helper** from Recommendation A to `tests/tributary.test.ts`.

3. **For each execution path, measure CU:**

   | Path                                             | Expected CU Range |
   | ------------------------------------------------ | ----------------- |
   | `execute_payment` (no referral)                  | ~45,000-55,000    |
   | `execute_payment` (1-level referral)             | ~50,000-60,000    |
   | `execute_payment` (3-level referral)             | ~60,000-75,000    |
   | `execute_composable` (no validation, no forward) | ~45,000-55,000    |
   | `execute_composable` (with validation + forward) | Variable          |

4. **Verify against Solana's compute budget:**

   ```bash
   # Confirm default budget
   solana config get
   # Default CU limit: 200,000
   # Max CU limit: 1,400,000 (with ComputeBudget instruction)
   ```

5. **Stress test with far-past due dates** to exercise the monthly catch-up loop in `calculate_next_payment_due`:

   ```typescript
   // Create policy with start_time 100 years in the past
   const farPast = Math.floor(Date.now() / 1000) - 100 * 365 * 86400;
   // ... measure CU for this edge case
   ```

6. **Use `solana-ledger-tool` or `solana log`** to inspect actual CU consumption in production transactions.

---

## Summary

| Aspect                        | Finding                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `execute_payment` max CPIs    | 6 (3 referral + 1 recipient + 1 gateway + 1 protocol)                      |
| `execute_composable` max CPIs | 5+ (2 variable external + 3 fixed transfers)                               |
| Referral depth                | Hardcoded to 3 levels (`[u16; 3]`) — bounded                               |
| Unbounded CPI risk            | Composable's validation + forward CPIs — external programs                 |
| Default budget fit            | `execute_payment`: Yes. `execute_composable`: Depends on external programs |
| Monitoring                    | **None** — no CU measurement in current test suite                         |
