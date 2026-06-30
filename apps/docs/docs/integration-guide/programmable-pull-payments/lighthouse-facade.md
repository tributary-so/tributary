# The Lighthouse Facade

Lighthouse is a read-only on-chain assertion program. Tributary stores a
serialized Lighthouse assertion in a `ValidationPda` and replays it via CPI at
`execute_composable` time — the transaction reverts if the assertion doesn't
hold.

The SDK ships a fluent builder that wraps the vendored official
`lighthouse-sdk-legacy` client so you never have to touch umi types. Import:

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";
```

!!! info "Program ID"
`LIGHTHOUSE_PROGRAM_ID = new PublicKey("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95")`
is the only entry in Tributary's `ALLOWED_VALIDATION_PROGRAMS`.

## The fluent shape

```typescript
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta) // pick the assertion family
  .amount(50_000_000, "<") // chain field assertions
  .build(); // serialize
```

`build()` returns:

```typescript
interface LighthouseAssertion {
  data: Buffer; // → passed as validationData to getCreateComposablePolicyInstruction
  numAccounts: number; // → passed as numValidationAccounts
  accounts: AccountMeta[]; // → the validation slice of executeComposable's remaining_accounts
}
```

The facade owns **only** the Lighthouse `target_account(s)`. The caller
assembles Tributary's full `remaining_accounts`:

```typescript
// executeComposable's remaining_accounts (caller-supplied, SDK prepends the ValidationPda):
const remainingAccounts = [...guard.accounts, ...forwardAccounts];
```

## Operators

Every numeric field accepts either a string alias or the matching enum. Strings
are preferred for readability.

```typescript
import { IntegerOperator, EquatableOperator } from "@tributary-so/sdk";
```

| String alias            | `IntegerOperator`    | Meaning          |
| ----------------------- | -------------------- | ---------------- |
| `"=="` / `"==="`        | `Equal`              | equal            |
| `"!="` / `"!=="`        | `NotEqual`           | not equal        |
| `">"`                   | `GreaterThan`        | greater than     |
| `"<"`                   | `LessThan`           | less than        |
| `">="`                  | `GreaterThanOrEqual` | greater-or-equal |
| `"<="`                  | `LessThanOrEqual`    | less-or-equal    |
| `"in"` / `"contains"`   | `Contains`           | membership       |
| `"!in"` / `"!contains"` | `DoesNotContain`     | non-membership   |

`EquatableOperator` accepts the same `==` / `===` / `!=` / `!==` strings.

## Assertion families

| Family                           | Method                            | Target accounts | Common fields                                                                                                                            |
| -------------------------------- | --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **SPL token account**            | `lighthouse.tokenAccount(ata)`    | 1               | `amount`, `mint`, `owner`, `delegate`, `state`, `isNative`, `delegatedAmount`, `closeAuthority`, `ownerIsDerived`                        |
| **SPL mint account**             | `lighthouse.mintAccount(mint)`    | 1               | `mintAuthority`, `supply`, `decimals`, `isInitialized`, `freezeAuthority`                                                                |
| **Account info**                 | `lighthouse.accountInfo(pubkey)`  | 1               | `lamports`, `dataLength`, `owner`, `rentEpoch`, `isSigner`, `isWritable`, `executable`                                                   |
| **Account data (raw bytes)**     | `lighthouse.accountData(pubkey)`  | 1               | `.at(offset, type, value, op)` — typed value at a byte offset (`Bool`, `U8`, `I8`, `U16`/`I16`, `U32`/`I32`, `U64`/`I64`, `U128`/`I128`) |
| **Account delta (two accounts)** | `lighthouse.accountDelta(a, b)`   | 2               | `.accountInfo(aOffset, value, op)` — no multi variant                                                                                    |
| **Sysvar clock**                 | `lighthouse.sysvarClock()`        | 0               | `.field(field, value, op)` — `Slot`, `EpochStartTimestamp`, `Epoch`, `LeaderScheduleEpoch`, `UnixTimestamp`                              |
| **Stake account**                | `lighthouse.stakeAccount(pubkey)` | 1               | `state`, `stakeFlags`                                                                                                                    |
| **Merkle tree account**          | `lighthouse.merkleTree(pubkey)`   | 1               | `.verifyLeaf(leafIndex, leafHash)` — no multi variant                                                                                    |

### Multi-assertions (single target)

For `tokenAccount`, `mintAccount`, `accountInfo`, `accountData`, and
`stakeAccount`, chaining multiple field assertions produces the compact
`*Multi` instruction (saves space + compute vs. multiple single CPIs):

```typescript
import { lighthouse } from "@tributary-so/sdk";

const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .state(2, "!=") // not frozen (1 = initialized, 2 = frozen)
  .build();
// numAccounts = 1, single CPI to AssertTokenAccountMulti
```

### Raw account-data assertion

For arbitrary on-chain accounts whose layout isn't covered by a typed family:

```typescript
const guard = lighthouse
  .accountData(someAccount)
  .at(64, "U64", 1_000_000n, ">=") // bigint for 64/128-bit
  .build();
```

### Two-account delta

```typescript
const guard = lighthouse
  .accountDelta(treasuryA, treasuryB)
  .accountInfo(0, 1_000_000_000n, ">=") // lamports delta
  .build();
// numAccounts = 2
```

### Sysvar clock (no target accounts)

```typescript
const guard = lighthouse
  .sysvarClock()
  .field("UnixTimestamp", 1_700_000_000n, ">")
  .build();
// numAccounts = 0, accounts = []
```

!!! warning "Validation data is capped at 1024 bytes"
The `ValidationPda` is allocated to fit `MAX_VALIDATION_DATA_SIZE`. Complex
multi-assertions that exceed 1024 bytes will be rejected at policy
creation. Prefer a single targeted assertion (e.g. balance `< threshold`)
over exhaustive checks.

## Putting it together

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";

// 1. Build the assertion
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// 2. Create the policy — validation enabled, forward disabled
const createIx = await sdk.getCreateComposablePolicyInstruction(
  USDC_MINT,
  recipient,
  gatewayPDA,
  policyType,
  "Balance guard",
  forwardConfig,
  LIGHTHOUSE_PROGRAM_ID,
  guard.numAccounts,
  guard.data
);

// 3. Execute — remaining_accounts gets [...guard.accounts, ...forwardAccounts]
//    (the SDK auto-prepends the ValidationPda)
const execIx = await sdk.executeComposable(
  composablePolicyPDA,
  Buffer.alloc(0), // forward disabled → empty
  new BN(50_000_000),
  guard.accounts
);
```

## Related

- [SDK surface](./sdk.md) — full `getCreateComposablePolicyInstruction` /
  `executeComposable` signatures.
- Example: [Auto-topup guard](./examples/auto-topup-guard.md).
- Lighthouse source → `packages/sdk/src/lighthouse.ts`.
