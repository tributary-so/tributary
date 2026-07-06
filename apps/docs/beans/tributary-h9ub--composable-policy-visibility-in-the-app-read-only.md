---
# tributary-h9ub
title: Composable policy visibility in the app (read-only)
status: todo
type: milestone
priority: high
created_at: 2026-07-06T16:32:09Z
updated_at: 2026-07-06T16:42:25Z
---

Bring ComposablePolicy into apps/app. Currently account-page.tsx only fetches/displays PaymentPolicy. Add SDK read methods + read-only listing + detail panel.


## Goal

Bring ComposablePolicy into the user-facing app (`apps/app`). Currently
`account-page.tsx` only fetches and displays PaymentPolicy (5 variants).
Composable policies are invisible to the wallet owner. This milestone adds
SDK read methods + a read-only listing and detail panel.

## Scope (confirmed via grilling session — Q1–Q7)

- **SDK read layer:** Mirror the PaymentPolicy read pattern. Add
  `getComposablePoliciesByUserPayment`, `getComposablePoliciesByRecipient`,
  `getComposablePoliciesByGateway`, `getAllComposablePolicies`,
  `getComposablePolicy(address)`. Same memcmp approach, `composablePolicy`
  account type.

- **App listing:** Composable policies appear in the SAME UserPayment
  grouping (by token mint) as regular PaymentPolicy entries. A "Composable"
  badge distinguishes them. The "My Policies" count includes composables.

- **Detail panel (read-only):**
  - "Composable" type badge + status badge (active/paused/completed)
  - Memo (decoded)
  - Recipient, gateway, token mint
  - Pull parameters from `policyType` (same 5 variants: subscription/milestone/etc.)
  - Forward program: raw pubkey (`forwardConfig.instructionConstraint.programId`) or "Disabled"
  - Input mint → Output mint
  - Pre-validation: "Enabled" / "Disabled" label (no assertion details)
  - Post-validation: same
  - Payment count, total paid
  - NO execute/pause/delete buttons — purely informational

## Out of scope

- Execute composable from the app (needs instructionData + remainingAccounts)
- Create composable from the app
- Validation hook details (assertion data, target accounts)
- Settlement shape labeling (deliver-no-transform / deliver-transform / act)
- Forward program name resolution (raw pubkey only)
- Pause/delete for composables (follow-up milestone)

## Design decisions

### ComposablePolicy account layout (from Rust struct)

```rust
#[account]
pub struct ComposablePolicy {
    pub bump: u8,              // offset 8  (1 byte)
    pub user_payment: Pubkey,  // offset 9  (32 bytes)  ← memcmp target
    pub gateway: Pubkey,       // offset 41 (32 bytes)  ← memcmp target
    pub status: PolicyStatus,  // offset 73 (enum)
    pub rent_payer: Pubkey,
    pub policy_type: PolicyType,    // 128 bytes fixed
    pub forward_config: ForwardConfig,
    pub pre_validation: ValidationSpec,
    pub post_validation: ValidationSpec,
    pub memo: [u8; 32],
    pub recipient: Pubkey,     // ⚠ deep in struct, after variable-size enums
    pub total_input: u64,      // replaces PaymentPolicy.total_paid
    pub total_output: u64,     // total delivered in output mint
    pub payment_count: u32,
    pub policy_id: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub padding: [u8; 192],
}
```

**memcmp offsets (Borsh, no alignment padding):**
- `user_payment` → **offset 9** (after discriminator 8 + bump 1)
- `gateway` → **offset 41** (9 + 32)
- `recipient` → deep in struct, after `forward_config` + `pre_validation` + `post_validation` + `memo`. Offset depends on whether ValidationSpec/ForwardConfig are fixed-size. Defer recipient filtering unless needed.

### SDK read methods

```
getComposablePoliciesByUserPayment(userPayment)  → memcmp offset 9
getComposablePoliciesByGateway(gateway)           → memcmp offset 41
getAllComposablePolicies()                        → no filter
getComposablePolicy(address)                      → fetchNullable
getComposablePoliciesByRecipient(recipient)       → DEFERRED (recipient offset variable)
```

**Field differences from PaymentPolicy:**
- `total_paid` → split into `total_input` + `total_output`
- New: `rent_payer`, `forward_config`, `pre_validation`, `post_validation`
- `recipient` is near the END, not second after user_payment

### Account page data model

Extend `UserPaymentWithPolicies`:
```
interface UserPaymentWithPolicies {
  userPaymentAddress: PublicKey
  userPayment: UserPayment
  policies: Array<{ publicKey: PublicKey; account: PaymentPolicy }>
  composablePolicies: Array<{ publicKey: PublicKey; account: ComposablePolicy }>  // NEW
}
```

Fetch: after regular policies, call `sdk.getComposablePoliciesByUserPayment(up)`.
Both arrays rendered in the same UserPayment group.

### Selection type (discriminated union)

```
type SelectedPolicy =
  | { kind: 'regular'; publicKey: PublicKey; account: PaymentPolicy }
  | { kind: 'composable'; publicKey: PublicKey; account: ComposablePolicy }
```

### ComposablePolicyCard (list item)

- "Composable" badge (distinct color)
- Status badge, memo, recipient (truncated), payment count
- Summary: forward program pubkey (truncated) or "Direct" if forward disabled

### ComposableDetailPanel (read-only)

No action buttons. Sections:
1. Header: "Composable Policy" + status
2. Pull parameters (from policyType — reuse variant display logic)
3. Forward config: program pubkey, input mint → output mint
4. Validation: pre/post labels
5. Stats: payment_count, total_input, total_output (NOT total_paid)
6. Details: policy address, recipient, gateway, token mint, rent_payer
