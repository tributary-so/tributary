/**
 * Lighthouse assertion facade for the Tributary SDK.
 *
 * Wraps the vendored official Lighthouse client (`lighthouse-sdk-legacy`) to
 * produce the serialized assertion *data* buffer that Tributary stores in a
 * ValidationPda and replays via CPI at execution time.
 *
 * This module is an anti-corruption layer: callers work with web3.js
 * {@link PublicKey} and plain TS primitives and never touch umi types. All
 * umi-shaped translation happens internally.
 *
 * Scope: the facade owns ONLY the Lighthouse target_account(s). Assembling
 * Tributary's full `remaining_accounts` list (ValidationPDA + targets) stays
 * with the caller.
 *
 * @example
 * ```ts
 * const guard = lighthouse
 *   .tokenAccount(hotWalletUsdcAta)
 *   .amount(50_000_000, "<")
 *   .build();
 * // guard.data        → Buffer (validationData)
 * // guard.numAccounts → 1  (numValidationAccounts)
 * // guard.accounts    → [{ pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false }]
 * ```
 */

import { PublicKey, type AccountMeta } from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  IntegerOperator,
  EquatableOperator,
  LogLevel,
  getAssertTokenAccountInstructionDataSerializer,
  getAssertTokenAccountMultiInstructionDataSerializer,
  getAssertMintAccountInstructionDataSerializer,
  getAssertMintAccountMultiInstructionDataSerializer,
  getAssertAccountInfoInstructionDataSerializer,
  getAssertAccountInfoMultiInstructionDataSerializer,
  getAssertAccountDataInstructionDataSerializer,
  getAssertAccountDataMultiInstructionDataSerializer,
  getAssertAccountDeltaInstructionDataSerializer,
  getAssertSysvarClockInstructionDataSerializer,
  getAssertStakeAccountInstructionDataSerializer,
  getAssertStakeAccountMultiInstructionDataSerializer,
  getAssertMerkleTreeAccountInstructionDataSerializer,
} from "lighthouse-sdk-legacy";

// Re-export the operator/log enums so callers use symbols, not magic numbers.
export {
  IntegerOperator,
  EquatableOperator,
  LogLevel,
} from "lighthouse-sdk-legacy";

/**
 * Lighthouse program address (devnet + mainnet-beta). The only entry in
 * Tributary's `ALLOWED_VALIDATION_PROGRAMS`.
 */
export const LIGHTHOUSE_PROGRAM_ID = new PublicKey(
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"
);

/**
 * A built Lighthouse assertion ready to hand to `createComposablePolicy`.
 */
export interface LighthouseAssertion {
  /** Serialized Lighthouse instruction data — stored in the ValidationPda. */
  data: Buffer;
  /** Number of Lighthouse read-accounts — maps to `numValidationAccounts`. */
  numAccounts: number;
  /** Ordered Lighthouse target_account(s) — the validation slice of remaining_accounts. */
  accounts: AccountMeta[];
}

// ─── Operator sugar ──────────────────────────────────────────────────────

/** String aliases accepted wherever an {@link IntegerOperator} is expected. */
export type IntOpString =
  | "=="
  | "==="
  | "!="
  | "!=="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "!in"
  | "contains"
  | "!contains";

/** String aliases accepted wherever an {@link EquatableOperator} is expected. */
export type EqOpString = "==" | "===" | "!=" | "!==";

const INT_OP_MAP: Record<string, IntegerOperator> = {
  "==": IntegerOperator.Equal,
  "===": IntegerOperator.Equal,
  "!=": IntegerOperator.NotEqual,
  "!==": IntegerOperator.NotEqual,
  ">": IntegerOperator.GreaterThan,
  "<": IntegerOperator.LessThan,
  ">=": IntegerOperator.GreaterThanOrEqual,
  "<=": IntegerOperator.LessThanOrEqual,
  in: IntegerOperator.Contains,
  contains: IntegerOperator.Contains,
  "!in": IntegerOperator.DoesNotContain,
  "!contains": IntegerOperator.DoesNotContain,
};

const EQ_OP_MAP: Record<string, EquatableOperator> = {
  "==": EquatableOperator.Equal,
  "===": EquatableOperator.Equal,
  "!=": EquatableOperator.NotEqual,
  "!==": EquatableOperator.NotEqual,
};

/** Resolve an integer operator from enum or string alias. */
export function intOp(op: IntegerOperator | IntOpString): IntegerOperator {
  return typeof op === "number" ? op : INT_OP_MAP[op];
}

/** Resolve an equatable operator from enum or string alias. */
export function eqOp(op: EquatableOperator | EqOpString): EquatableOperator {
  return typeof op === "number" ? op : EQ_OP_MAP[op];
}

// ─── Shared helpers ──────────────────────────────────────────────────────

const SILENT = LogLevel.Silent;

function readOnly(...keys: PublicKey[]): AccountMeta[] {
  return keys.map((pubkey) => ({ pubkey, isSigner: false, isWritable: false }));
}

/**
 * Serialize a single-assertion instruction data buffer.
 * @internal
 */
function serSingle(
  fn: () => { serialize: (input: any) => Uint8Array },
  assertion: any
): Buffer {
  return Buffer.from(fn().serialize({ logLevel: SILENT, assertion }));
}

/**
 * Serialize a multi-assertion instruction data buffer.
 * @internal
 */
function serMulti(
  fn: () => { serialize: (input: any) => Uint8Array },
  assertions: any[]
): Buffer {
  return Buffer.from(fn().serialize({ logLevel: SILENT, assertions }));
}

// ─── Token account ───────────────────────────────────────────────────────

/**
 * Fluent builder for `AssertTokenAccount` / `AssertTokenAccountMulti`.
 *
 * Each field method appends an assertion. `build()` auto-selects the single
 * instruction (1 assertion) or the multi instruction (>1 assertions, saves
 * space + compute).
 */
export class TokenAccountBuilder {
  private readonly target: PublicKey;
  private readonly items: any[] = [];

  /** @internal */
  constructor(target: PublicKey) {
    this.target = target;
  }

  /** Assert the token account's `amount` field. */
  amount(
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    this.items.push({ __kind: "Amount", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the `mint` field. */
  mint(
    value: PublicKey,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "Mint",
      value: value.toBase58(),
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the `owner` field. */
  owner(
    value: PublicKey,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "Owner",
      value: value.toBase58(),
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the `delegate` field (null = no delegate). */
  delegate(
    value: PublicKey | null,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "Delegate",
      value: value ? value.toBase58() : null,
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the `state` field (1 = initialized, 2 = frozen). */
  state(value: number, operator: IntegerOperator | IntOpString): this {
    this.items.push({ __kind: "State", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the `is_native` field (null = not native). */
  isNative(
    value: bigint | null,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({ __kind: "IsNative", value, operator: eqOp(operator) });
    return this;
  }
  /** Assert the `delegated_amount` field. */
  delegatedAmount(
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    this.items.push({
      __kind: "DelegatedAmount",
      value,
      operator: intOp(operator),
    });
    return this;
  }
  /** Assert the `close_authority` field (null = none). */
  closeAuthority(
    value: PublicKey | null,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "CloseAuthority",
      value: value ? value.toBase58() : null,
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the owner is the derived ATA owner. */
  ownerIsDerived(): this {
    this.items.push({ __kind: "TokenAccountOwnerIsDerived" });
    return this;
  }

  /** Build the serialized assertion. Single (1) or multi (>1) auto-selected. */
  build(): LighthouseAssertion {
    if (this.items.length === 0)
      throw new Error("TokenAccountBuilder: no assertions added");
    const data =
      this.items.length === 1
        ? serSingle(
            getAssertTokenAccountInstructionDataSerializer,
            this.items[0]
          )
        : serMulti(
            getAssertTokenAccountMultiInstructionDataSerializer,
            this.items
          );
    return { data, numAccounts: 1, accounts: readOnly(this.target) };
  }
}

// ─── Mint account ────────────────────────────────────────────────────────

/** Fluent builder for `AssertMintAccount` / `AssertMintAccountMulti`. */
export class MintAccountBuilder {
  private readonly target: PublicKey;
  private readonly items: any[] = [];

  /** @internal */
  constructor(target: PublicKey) {
    this.target = target;
  }

  /** Assert the `mint_authority` field (null = none). */
  mintAuthority(
    value: PublicKey | null,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "MintAuthority",
      value: value ? value.toBase58() : null,
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the `supply` field. */
  supply(
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    this.items.push({ __kind: "Supply", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the `decimals` field. */
  decimals(value: number, operator: IntegerOperator | IntOpString): this {
    this.items.push({ __kind: "Decimals", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the `is_initialized` field. */
  isInitialized(
    value: boolean,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "IsInitialized",
      value,
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the `freeze_authority` field (null = none). */
  freezeAuthority(
    value: PublicKey | null,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "FreezeAuthority",
      value: value ? value.toBase58() : null,
      operator: eqOp(operator),
    });
    return this;
  }

  build(): LighthouseAssertion {
    if (this.items.length === 0)
      throw new Error("MintAccountBuilder: no assertions added");
    const data =
      this.items.length === 1
        ? serSingle(
            getAssertMintAccountInstructionDataSerializer,
            this.items[0]
          )
        : serMulti(
            getAssertMintAccountMultiInstructionDataSerializer,
            this.items
          );
    return { data, numAccounts: 1, accounts: readOnly(this.target) };
  }
}

// ─── Account info ────────────────────────────────────────────────────────

/** Fluent builder for `AssertAccountInfo` / `AssertAccountInfoMulti`. */
export class AccountInfoBuilder {
  private readonly target: PublicKey;
  private readonly items: any[] = [];

  /** @internal */
  constructor(target: PublicKey) {
    this.target = target;
  }

  /** Assert the account's lamports. */
  lamports(
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    this.items.push({ __kind: "Lamports", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the account's data length. */
  dataLength(
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    this.items.push({ __kind: "DataLength", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the account's owner. */
  owner(
    value: PublicKey,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({
      __kind: "Owner",
      value: value.toBase58(),
      operator: eqOp(operator),
    });
    return this;
  }
  /** Assert the account's rent epoch. */
  rentEpoch(
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    this.items.push({ __kind: "RentEpoch", value, operator: intOp(operator) });
    return this;
  }
  /** Assert the account's `is_signer` flag. */
  isSigner(
    value: boolean,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({ __kind: "IsSigner", value, operator: eqOp(operator) });
    return this;
  }
  /** Assert the account's `is_writable` flag. */
  isWritable(
    value: boolean,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({ __kind: "IsWritable", value, operator: eqOp(operator) });
    return this;
  }
  /** Assert the account's `executable` flag. */
  executable(
    value: boolean,
    operator: EquatableOperator | EqOpString = "=="
  ): this {
    this.items.push({ __kind: "Executable", value, operator: eqOp(operator) });
    return this;
  }

  build(): LighthouseAssertion {
    if (this.items.length === 0)
      throw new Error("AccountInfoBuilder: no assertions added");
    const data =
      this.items.length === 1
        ? serSingle(
            getAssertAccountInfoInstructionDataSerializer,
            this.items[0]
          )
        : serMulti(
            getAssertAccountInfoMultiInstructionDataSerializer,
            this.items
          );
    return { data, numAccounts: 1, accounts: readOnly(this.target) };
  }
}

// ─── Account data (raw byte-range) ───────────────────────────────────────

/** Numeric type variants for {@link AccountDataBuilder}. */
export type DataValueType =
  | "Bool"
  | "U8"
  | "I8"
  | "U16"
  | "I16"
  | "U32"
  | "I32"
  | "U64"
  | "I64"
  | "U128"
  | "I128";

/**
 * Fluent builder for `AssertAccountData` / `AssertAccountDataMulti`.
 *
 * Each assertion reads a typed value at a byte offset in the account data.
 */
export class AccountDataBuilder {
  private readonly target: PublicKey;
  private readonly items: Array<{ offset: number; assertion: any }> = [];

  /** @internal */
  constructor(target: PublicKey) {
    this.target = target;
  }

  /**
   * Assert a typed value at a byte offset.
   * @param offset - Byte offset into the account data
   * @param type - One of {@link DataValueType}
   * @param value - Expected value (bigint for 64/128-bit, number otherwise)
   * @param operator - Integer operator for numeric types, equatable for Bool/Pubkey/Bytes
   */
  at(
    offset: number,
    type: Exclude<DataValueType, "Bool">,
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this;
  at(
    offset: number,
    type: "Bool",
    value: boolean,
    operator: EquatableOperator | EqOpString
  ): this;
  at(
    offset: number,
    type: DataValueType,
    value: number | bigint | boolean,
    operator: IntegerOperator | IntOpString | EquatableOperator | EqOpString
  ): this {
    const op =
      type === "Bool"
        ? eqOp(operator as EqOpString)
        : intOp(operator as IntOpString);
    this.items.push({
      offset,
      assertion: { __kind: type, value, operator: op },
    });
    return this;
  }

  build(): LighthouseAssertion {
    if (this.items.length === 0)
      throw new Error("AccountDataBuilder: no assertions added");
    const data =
      this.items.length === 1
        ? Buffer.from(
            getAssertAccountDataInstructionDataSerializer().serialize({
              logLevel: SILENT,
              offset: this.items[0].offset,
              assertion: this.items[0].assertion,
            })
          )
        : serMulti(
            getAssertAccountDataMultiInstructionDataSerializer,
            this.items
          );
    return { data, numAccounts: 1, accounts: readOnly(this.target) };
  }
}

// ─── Account delta (two-account comparison) ──────────────────────────────

/**
 * Fluent builder for `AssertAccountDelta` — compares fields across two accounts.
 *
 * Note: AccountDelta has no multi-instruction variant.
 */
export class AccountDeltaBuilder {
  private readonly accountA: PublicKey;
  private readonly accountB: PublicKey;
  private item: any | null = null;

  /** @internal */
  constructor(accountA: PublicKey, accountB: PublicKey) {
    this.accountA = accountA;
    this.accountB = accountB;
  }

  /** Assert a delta on an account-info field (e.g. lamports changed by N). */
  accountInfo(
    aOffset: number,
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    if (this.item)
      throw new Error("AccountDeltaBuilder: only one assertion supported");
    this.item = {
      __kind: "AccountInfo",
      aOffset,
      assertion: { __kind: "Lamports", value, operator: intOp(operator) },
    };
    return this;
  }

  build(): LighthouseAssertion {
    if (!this.item) throw new Error("AccountDeltaBuilder: no assertion added");
    const data = serSingle(
      getAssertAccountDeltaInstructionDataSerializer,
      this.item
    );
    return {
      data,
      numAccounts: 2,
      accounts: readOnly(this.accountA, this.accountB),
    };
  }
}

// ─── Sysvar clock ────────────────────────────────────────────────────────

/** Sysvar clock field variants. */
export type ClockField =
  | "Slot"
  | "EpochStartTimestamp"
  | "Epoch"
  | "LeaderScheduleEpoch"
  | "UnixTimestamp";

/**
 * Fluent builder for `AssertSysvarClock` — reads the sysvar, no target accounts.
 *
 * Note: SysvarClock has no multi-instruction variant.
 */
export class SysvarClockBuilder {
  private item: any | null = null;

  /** Assert a sysvar clock field. */
  field(
    field: ClockField,
    value: number | bigint,
    operator: IntegerOperator | IntOpString
  ): this {
    if (this.item)
      throw new Error("SysvarClockBuilder: only one assertion supported");
    this.item = { __kind: field, value, operator: intOp(operator) };
    return this;
  }

  build(): LighthouseAssertion {
    if (!this.item) throw new Error("SysvarClockBuilder: no assertion added");
    const data = serSingle(
      getAssertSysvarClockInstructionDataSerializer,
      this.item
    );
    return { data, numAccounts: 0, accounts: [] };
  }
}

// ─── Stake account ───────────────────────────────────────────────────────

/** Fluent builder for `AssertStakeAccount` / `AssertStakeAccountMulti`. */
export class StakeAccountBuilder {
  private readonly target: PublicKey;
  private readonly items: any[] = [];

  /** @internal */
  constructor(target: PublicKey) {
    this.target = target;
  }

  /** Assert the stake account's state. */
  state(value: number, operator: EquatableOperator | EqOpString = "=="): this {
    this.items.push({ __kind: "State", value, operator: eqOp(operator) });
    return this;
  }
  /** Assert the stake flags. */
  stakeFlags(value: number, operator: IntegerOperator | IntOpString): this {
    this.items.push({ __kind: "StakeFlags", value, operator: intOp(operator) });
    return this;
  }

  build(): LighthouseAssertion {
    if (this.items.length === 0)
      throw new Error("StakeAccountBuilder: no assertions added");
    const data =
      this.items.length === 1
        ? serSingle(
            getAssertStakeAccountInstructionDataSerializer,
            this.items[0]
          )
        : serMulti(
            getAssertStakeAccountMultiInstructionDataSerializer,
            this.items
          );
    return { data, numAccounts: 1, accounts: readOnly(this.target) };
  }
}

// ─── Merkle tree account ─────────────────────────────────────────────────

/**
 * Fluent builder for `AssertMerkleTreeAccount` — verifies a leaf.
 *
 * Note: MerkleTree has no multi-instruction variant.
 */
export class MerkleTreeBuilder {
  private readonly target: PublicKey;
  private item: any | null = null;

  /** @internal */
  constructor(target: PublicKey) {
    this.target = target;
  }

  /** Verify a leaf at an index against its hash. */
  verifyLeaf(leafIndex: number, leafHash: Uint8Array): this {
    if (this.item)
      throw new Error("MerkleTreeBuilder: only one assertion supported");
    this.item = { __kind: "VerifyLeaf", leafIndex, leafHash };
    return this;
  }

  build(): LighthouseAssertion {
    if (!this.item) throw new Error("MerkleTreeBuilder: no assertion added");
    const data = serSingle(
      getAssertMerkleTreeAccountInstructionDataSerializer,
      this.item
    );
    return { data, numAccounts: 1, accounts: readOnly(this.target) };
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────

/**
 * Build a Lighthouse assertion. Each method returns a fluent builder bound to
 * the assertion's target account(s).
 *
 * @example Token balance guardrail (single)
 * ```ts
 * lighthouse.tokenAccount(ata).amount(50_000_000, "<").build()
 * ```
 *
 * @example Multi-assertion (saves space + compute)
 * ```ts
 * lighthouse.tokenAccount(ata)
 *   .amount(50_000_000, "<")
 *   .state(2, "!=")   // not frozen
 *   .build()
 * ```
 *
 * @example Sysvar clock (no target accounts)
 * ```ts
 * lighthouse.sysvarClock().field("Slot", 1000n, ">").build()
 * ```
 */
export const lighthouse = {
  /** Assert fields of an SPL token account. */
  tokenAccount(target: PublicKey): TokenAccountBuilder {
    return new TokenAccountBuilder(target);
  },
  /** Assert fields of an SPL mint account. */
  mintAccount(target: PublicKey): MintAccountBuilder {
    return new MintAccountBuilder(target);
  },
  /** Assert generic account-info fields (lamports, owner, data length, …). */
  accountInfo(target: PublicKey): AccountInfoBuilder {
    return new AccountInfoBuilder(target);
  },
  /** Assert raw typed values at byte offsets in account data. */
  accountData(target: PublicKey): AccountDataBuilder {
    return new AccountDataBuilder(target);
  },
  /** Compare fields between two accounts (delta). */
  accountDelta(accountA: PublicKey, accountB: PublicKey): AccountDeltaBuilder {
    return new AccountDeltaBuilder(accountA, accountB);
  },
  /** Assert sysvar clock fields (no target accounts). */
  sysvarClock(): SysvarClockBuilder {
    return new SysvarClockBuilder();
  },
  /** Assert fields of a stake account. */
  stakeAccount(target: PublicKey): StakeAccountBuilder {
    return new StakeAccountBuilder(target);
  },
  /** Verify a merkle-tree account leaf. */
  merkleTree(target: PublicKey): MerkleTreeBuilder {
    return new MerkleTreeBuilder(target);
  },
};

export type Lighthouse = typeof lighthouse;

// ─── Decode ──────────────────────────────────────────────────────────────

const INT_OP_LABELS: Record<number, string> = {
  [IntegerOperator.Equal]: "==",
  [IntegerOperator.NotEqual]: "!=",
  [IntegerOperator.GreaterThan]: ">",
  [IntegerOperator.LessThan]: "<",
  [IntegerOperator.GreaterThanOrEqual]: ">=",
  [IntegerOperator.LessThanOrEqual]: "<=",
  [IntegerOperator.Contains]: "contains",
  [IntegerOperator.DoesNotContain]: "!contains",
};

const EQ_OP_LABELS: Record<number, string> = {
  [EquatableOperator.Equal]: "==",
  [EquatableOperator.NotEqual]: "!=",
};

function bigintToNumber(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v && typeof v === "object" && "toNumber" in (v as any)) {
    return Number((v as any).toString());
  }
  return v;
}

function simplifyAssertion(raw: unknown): unknown {
  const a = raw as Record<string, unknown>;
  if (!a || typeof a !== "object") return raw;
  const kind = a.__kind ?? a.constructor?.name;
  const out: Record<string, unknown> = {};
  if (kind) out.kind = String(kind);

  for (const [k, v] of Object.entries(a)) {
    if (k === "__kind") continue;
    let sv = bigintToNumber(v);
    if (sv && typeof sv === "object" && "__kind" in (sv as object)) {
      sv = simplifyAssertion(sv);
    }
    if (k === "operator") {
      const num = typeof v === "number" ? v : Number(v);
      out[k] = INT_OP_LABELS[num] ?? EQ_OP_LABELS[num] ?? num;
    } else {
      out[k] = sv;
    }
  }
  return out;
}

/** Serializer-name + fn pairs to try in order when decoding. */
const DECODERS: Array<
  [
    string,
    () => {
      deserialize: (bytes: Uint8Array, offset?: number) => [unknown, number];
    }
  ]
> = [
  ["tokenAccount", getAssertTokenAccountInstructionDataSerializer],
  ["tokenAccountMulti", getAssertTokenAccountMultiInstructionDataSerializer],
  ["mintAccount", getAssertMintAccountInstructionDataSerializer],
  ["mintAccountMulti", getAssertMintAccountMultiInstructionDataSerializer],
  ["accountInfo", getAssertAccountInfoInstructionDataSerializer],
  ["accountInfoMulti", getAssertAccountInfoMultiInstructionDataSerializer],
  ["accountData", getAssertAccountDataInstructionDataSerializer],
  ["accountDataMulti", getAssertAccountDataMultiInstructionDataSerializer],
  ["accountDelta", getAssertAccountDeltaInstructionDataSerializer],
  ["sysvarClock", getAssertSysvarClockInstructionDataSerializer],
  ["stakeAccount", getAssertStakeAccountInstructionDataSerializer],
  ["stakeAccountMulti", getAssertStakeAccountMultiInstructionDataSerializer],
  ["merkleTree", getAssertMerkleTreeAccountInstructionDataSerializer],
];

/**
 * Decode a serialized Lighthouse assertion data buffer into a readable
 * structure. Tries each known instruction-data deserializer; the first one
 * that succeeds identifies the assertion family.
 *
 * Returns `null` if no deserializer matches (corrupt or unknown format).
 */
export function decodeAssertionData(
  data: Buffer
): { kind: string; logLevel: number; assertions: unknown[] } | null {
  for (const [kind, getFn] of DECODERS) {
    try {
      const [decoded] = getFn().deserialize(new Uint8Array(data));
      const d = decoded as Record<string, unknown>;
      const isMulti = "assertions" in d;
      const raw = isMulti ? (d.assertions as unknown[]) : [d.assertion];
      return {
        kind,
        logLevel:
          typeof d.logLevel === "number" ? d.logLevel : Number(d.logLevel),
        assertions: raw.map(simplifyAssertion),
      };
    } catch {
      // try next decoder
    }
  }
  return null;
}
