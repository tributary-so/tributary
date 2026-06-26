---
# tributary-m2bu
title: 'C-02: Composable CPI Forwarding — ByteRangeCheck Must Pin Discriminator'
status: completed
type: task
priority: critical
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# C-02: Composable CPI Forwarding — ByteRangeCheck Must Pin Discriminator

| Field        | Value                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| **Severity** | Medium                                                                                 |
| **File**     | `programs/tributary/src/instructions/composable/create_composable_policy.rs`           |
| **Function** | `CreateComposablePolicy::handler` (lines 78–86)                                        |
| **Related**  | `programs/tributary/src/state/composable_policy.rs`, `programs/tributary/src/error.rs` |

---

## Description

The composable execution path forwards a CPI to a whitelisted program using `instruction_data` supplied by the caller. The `ByteRangeCheck` mechanism in the `ForwardConfig` is the sole constraint on what `instruction_data` is valid at execution time — it pins specific byte ranges to expected values stored in the policy.

**The user creates composable policies** (the gateway signer pays rent, but the policy reflects the user's subscription). The `ByteRangeCheck` array is set at policy creation and locks the instruction selector. At execution time, `validate_byte_ranges` in `execute_composable.rs:16–24` checks that the provided `instruction_data` matches these pinned ranges.

The gap: there is **no program-level enforcement that a `ByteRangeCheck` covers the instruction selector** starting at byte 0. A policy can be created with `ByteRangeCheck` entries covering arbitrary offsets (e.g., `offset=4`, `length=1`) while leaving the instruction selector unconstrained. This means `instruction_data` at execution time could match a different instruction on the target program than intended.

Since the user creates the policy and confirms the `instruction_data`, this is a defense-in-depth issue rather than a direct exploit path. However, enforcing instruction-selector coverage prevents accidental misuse and ensures the locked instruction is unambiguous.

---

## Attack Scenario

**Preconditions:**

- A composable policy is created without a `ByteRangeCheck` covering `offset=0, length=8`.

**Step-by-step:**

1. **Policy creation.** A composable policy is created with `num_data_checks=1` and a check at `offset=8, length=1` — pinning only a data argument byte, not the instruction selector at byte 0.

2. **Execution.** `execute_composable` is called with `instruction_data` whose bytes 8 match the expected value but whose discriminator (bytes 0–7) differs from the originally intended instruction.

3. **Byte-range check passes** because only the non-discriminator offset was checked.

4. **Forward CPI executes** a different instruction on the whitelisted program than the one the policy was designed for.

---

## Impact

- **Instruction substitution.** Without discriminator pinning, the `ByteRangeCheck` only constrains partial data — the actual instruction invoked on the target program can differ from what the policy intended.
- **Defense-in-depth gap.** The user creates the policy and thus implicitly confirms the instruction, but there's no program-level guarantee that the locked bytes uniquely identify the instruction.

---

## Patch

### Enforce Instruction-Selector Coverage at Policy Creation

Require that at least one `ByteRangeCheck` has `offset=0` and `length > 0`, pinning the instruction selector starting at byte 0. The length is not fixed to 8 since non-Anchor programs may use fewer bytes for instruction selection:

```rust
// In create_composable_policy.rs, replace the byte-range check validation loop:

let mut covers_discriminator = false;
for i in 0..forward_config.num_data_checks as usize {
    let check = &forward_config.data_checks[i];
    require!(
        (check.offset as u16)
            .checked_add(check.length as u16)
            .map_or(false, |v| v <= 1024),
        TributaryError::ByteRangeCheckFailed
    );
    if check.offset == 0 && check.length > 0 {
        covers_discriminator = true;
    }
}
require!(
    covers_discriminator,
    TributaryError::DiscriminatorCheckRequired
);
```

### Add Error Variant

```rust
// In error.rs:
#[msg("At least one ByteRangeCheck must start at offset 0 to pin the instruction selector")]
DiscriminatorCheckRequired,
```

### Why This Is Sufficient

Unlike the original report's claim, the **user** creates composable policies — the `instruction_data` and `ByteRangeCheck` configuration reflect the user's subscription intent. The gateway signer pays rent but does not control the policy's instruction selection. Enforcing `offset=0, length>0` ensures the instruction selector is always pinned, making the target instruction unambiguous. The `expected` bytes are set by the user at policy creation, locking the specific instruction.

The length is intentionally not fixed to 8 — Anchor uses 8-byte discriminators, but other programs (e.g., native Solana programs, custom runtimes) may use shorter selectors. The policy creator chooses the appropriate length for the target program.

No instruction allowlist is needed — the user chooses which instruction to authorize, and the program enforces that this choice is properly locked via the instruction-selector coverage requirement.

---

## Testing Instructions

### 1. Test: Policy creation without discriminator check is rejected

```typescript
it("rejects composable policy without discriminator byte-range check", async () => {
    const forwardConfig = {
        targetProgram: ALLOWED_FORWARD_PROGRAMS[0],
        inputMint: usdcMint,
        outputMint: usdcMint,
        minOutputAmount: null,
        forwardFlags: 0,
        numDataChecks: 1,
        dataChecks: [
            { offset: 8, length: 1, expected: [0,0,0,0,0,0,0,0] }, // NOT covering discriminator
            { offset: 0, length: 0, expected: [0,0,0,0,0,0,0,0] },
            { offset: 0, length: 0, expected: [0,0,0,0,0,0,0,0] },
            { offset: 0, length: 0, expected: [0,0,0,0,0,0,0,0] },
        ],
    };

    try {
        await program.methods
            .createComposablePolicy(schedule, memo, forwardConfig, ...)
            .accounts({...})
            .rpc();
        assert.fail("Should have rejected policy without discriminator check");
    } catch (e) {
        assert.include(e.message, "DiscriminatorCheckRequired");
    }
});
```

### 2. Test: Policy creation with instruction-selector check succeeds

```typescript
it("accepts composable policy with instruction-selector byte-range check", async () => {
    // Works with any length > 0 at offset 0 — Anchor uses 8, native programs may use less
    const forwardConfig = {
        targetProgram: ALLOWED_FORWARD_PROGRAMS[0],
        inputMint: usdcMint,
        outputMint: usdcMint,
        minOutputAmount: null,
        forwardFlags: 0,
        numDataChecks: 1,
        dataChecks: [
            { offset: 0, length: 8, expected: [0x36, 0x0e, 0x57, 0x3b, 0xa3, 0x0e, 0x3f, 0x97] },
            { offset: 0, length: 0, expected: [0,0,0,0,0,0,0,0] },
            { offset: 0, length: 0, expected: [0,0,0,0,0,0,0,0] },
            { offset: 0, length: 0, expected: [0,0,0,0,0,0,0,0] },
        ],
    };

    await program.methods
        .createComposablePolicy(schedule, memo, forwardConfig, ...)
        .accounts({...})
        .rpc();
    // Should succeed
});
```

### 3. Run the Test Suite

```bash
anchor test                    # Solana program tests (Rust + TypeScript)
cd sdk && pnpm run build       # Verify SDK compiles
pnpm run lint                  # Lint all workspaces
```

---

## Summary

The `ByteRangeCheck` validation at policy creation did not enforce coverage of the instruction selector starting at byte 0. Since the user creates policies and confirms `instruction_data`, this is a defense-in-depth fix: enforce that at least one `ByteRangeCheck` must have `offset=0` and `length>0` to pin the instruction selector, ensuring the target instruction is unambiguously locked at policy creation time. The length is not fixed to accommodate non-Anchor programs with different selector sizes.

**Severity downgrade rationale**: The original report assumed a malicious gateway authority creating policies — but the user creates policies, not the gateway. The gateway signer merely pays rent. The user controls which instruction is authorized, so the threat is limited to accidental misconfiguration rather than active exploitation.
