# Fixed-size PDAs (no realloc)

## Decision

All Tributary state accounts use **fixed-size types** (`[T; N]`) for every
variable-length field. No account ever calls `realloc`. Account sizes are
compile-time `const` values derived from the struct layout, not runtime
computations.

| Field                      | Type                  | Rationale for the cap                                         |
| -------------------------- | --------------------- | ------------------------------------------------------------- |
| `ByteRangeCheck` array     | `[ByteRangeCheck; 4]` | 4 checks covers selector + 3 arg pins                         |
| Forward pinned accounts    | `[Pubkey; 4]`         | Meteora DLMM route: lbPair + reserveX + reserveY + 1 wildcard |
| Validation target accounts | `[Pubkey; 2]`         | Highest Lighthouse arity in use (`accountDelta` = 2)          |
| Assertion data             | `[u8; 1024]`          | All Lighthouse assertion families fit                         |
| Memo                       | `[u8; 32]`            | 32 bytes ≈ 32 ASCII chars                                     |
| ComposablePolicy padding   | `[u8; 192]`           | absorbs future fields without resize                          |

When a cap is insufficient the fix is a **design change** (new program
version, migration), not a runtime realloc.

## Rejected alternative: dynamic-size PDAs (Squads model)

Squads' smart-account-program stores full transaction definitions — arbitrary
instruction lists with per-instruction account sets — as on-chain accounts.
They use `Vec<AccountKey>` / `Vec<Instruction>` and `realloc` the account to
fit. This works for Squads because a transaction is user-arbitrary data: one
proposal may have 1 instruction, another 20.

Tributary rejected this approach:

1. **No user-driven variability.** Tributary's state is _configuration_, not
   user-arbitrary content. The maximum arity of every field is known at
   design time. No user ever needs 17 byte-range checks or 50 forward-account
   pins. Exceeding a cap means the _protocol design_ changed, which warrants a
   new program version — not a runtime resize.

2. **`realloc` is an attack surface.** Solana's `AccountData::realloc` has a
   per-call compute cost, a rent-adjustment requirement (up = pay rent,
   down = reclaim), and a CPI ownership check. A realloc-down can zero data
   that an indexer is still reading; a realloc-up that under-pays rent fails
   mid-transaction, leaving partial state. Fixed-size eliminates the entire
   bug class: the account is born at the right size and never changes.

3. **Borsh deserialisation stability.** Fixed-size types (`[T; N]`) carry
   their length in the type, not in a data prefix. `Vec<T>` prepends a 4-byte
   LE length — a single corrupted byte shifts every subsequent field and
   silently corrupts the account. Fixed arrays deserialize positionally;
   there is no length prefix to corrupt.

4. **`init` space is a compile-time `const`.** Anchor's `#[account(init,
space = T::SIZE)]` requires the space upfront. With fixed-size, `SIZE` is
   a `const` — the compiler verifies it. With dynamic-size, the caller
   computes `8 + runtime_value` and passes it; getting it wrong either wastes
   rent (too big) or truncates the last field (too small → silent data loss).

5. **Rent waste is trivial.** The cost of unused capacity (e.g. 128 bytes of
   `Pubkey` padding when only 1 of 4 pins is active) is ~0.001 SOL at current
   rent — reclaimable on account close. The engineering cost of a realloc
   system (resize instruction, size negotiation, rent reconciliation,
   migration path, test coverage for the resize edge cases) is orders of
   magnitude higher.

6. **No lifecycle complexity.** No `resize_account` instruction. No
   `update_size_limit` governance call. No migration when a cap grows from
   4 to 8 — that's a new ADR and a new program version, which is the correct
   weight for a structural change. The padding field (`[u8; N]`) on each
   account absorbs minor field additions without any resize.

## When this decision would be revisited

If a future feature requires storing genuinely user-arbitrary-length data on
a Tributary PDA (e.g. a composable policy that chains N forward steps, or a
validation assertion that exceeds 1024 bytes), the right answer is likely a
**separate data account** keyed by the policy (not a realloc of the policy
itself) — the ValidationPda pattern already in use. This keeps the main
account fixed-size while allowing unbounded companion data.

(bean tributary-zvku)
