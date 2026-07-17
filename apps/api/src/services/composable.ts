/**
 * Composable Policy Service
 *
 * Read-only access to the ComposablePolicy family: filtered list + single
 * account fetch, both normalized for JSON (32-byte memo decoded,
 * total_input/total_output + timestamps BN→number, padding/bump stripped,
 * `policyAccount` carried). forward_config and the pre/post validation
 * specs pass through untouched.
 *
 * ponytail: the brief routes this through `ComposablePolicyTracker`
 * (packages/payments, sibling bean tributary-2r5m / tributary-3mho, not yet
 * landed). This service constructs a Tributary program instance directly —
 * the exact fetch the tracker will perform — so the route compiles and works
 * today. When the tracker lands, swap `buildComposableFilters` + the
 * `program.account.composablePolicy.all(...)` call for
 * `tracker.getComposablePoliciesForOptions(options)`.
 */

import {
  Keypair,
  PublicKey,
  type GetProgramAccountsFilter,
} from "@solana/web3.js";
import { PolicyLookupOptions } from "@tributary-so/payments";
import { Tributary, decodeMemo, ComposablePolicy } from "@tributary-so/sdk";
import { getConnection } from "./solana";

/**
 * ComposablePolicy memcmp offsets, measured from byte 0 (including the 8-byte
 * Anchor discriminator). ComposablePolicy stores `bump` at offset 8 — BEFORE
 * `user_payment` — which differs from PaymentPolicy, so the offsets are NOT
 * interchangeable.
 *
 * Only `user_payment` (9) and `gateway` (41) are used for memcmp here: they
 * match the SDK's own `getComposablePoliciesByUserPayment` / `…ByGateway`
 * methods, so the offsets are confirmed. `recipient` (deep, ~538) and `memo`
 * (~506) sit past the variable-size policy_type/forward_config block; rather
 * than hard-code fragile deep offsets (the payment side already carries a
 * stale memo offset), they are post-filtered in JS. The milestone explicitly
 * sanctions a post-filter fallback for recipient.
 */
const OFFSET_USER_PAYMENT = 9; // 8 disc + 1 bump
const OFFSET_GATEWAY = 41; // 9 + 32 (user_payment)

/**
 * A {@link ComposablePolicy} normalized for JSON serialization:
 * - `memo` u8[32] → decoded string
 * - top-level BN fields (`totalInput`, `totalOutput`, `createdAt`,
 *   `updatedAt`) → JS numbers
 * - `padding` / `bump` redacted to `undefined`
 * - `forwardConfig`, `preValidation`, `postValidation` carried through
 * - `policyAccount` carries the original policy PDA
 */
export type ComposablePolicyDetails = Omit<
  ComposablePolicy,
  | "padding"
  | "bump"
  | "memo"
  | "totalInput"
  | "totalOutput"
  | "createdAt"
  | "updatedAt"
> & {
  padding: undefined;
  bump: undefined;
  memo: string;
  totalInput: number;
  totalOutput: number;
  createdAt: number;
  updatedAt: number;
  policyAccount: PublicKey;
};

function normalizeComposable(
  account: ComposablePolicy,
  publicKey: PublicKey
): ComposablePolicyDetails {
  return {
    ...account,
    memo: decodeMemo(account.memo),
    padding: undefined,
    bump: undefined,
    totalInput: account.totalInput.toNumber(),
    totalOutput: account.totalOutput.toNumber(),
    createdAt: account.createdAt.toNumber(),
    updatedAt: account.updatedAt.toNumber(),
    policyAccount: publicKey,
  };
}

function buildComposableFilters(
  tributary: Tributary,
  options: PolicyLookupOptions
): GetProgramAccountsFilter[] {
  const filters: GetProgramAccountsFilter[] = [];

  if (options.walletPublicKey && options.tokenMint) {
    const userPayment = tributary.getUserPaymentPda(
      new PublicKey(options.walletPublicKey),
      new PublicKey(options.tokenMint)
    ).address;
    filters.push({
      memcmp: { offset: OFFSET_USER_PAYMENT, bytes: userPayment.toBase58() },
    });
  }
  if (options.gatewayPublicKey) {
    filters.push({
      memcmp: { offset: OFFSET_GATEWAY, bytes: options.gatewayPublicKey },
    });
  }
  return filters;
}

/**
 * List composable policies matching the given filter options. Filter rules
 * mirror the PaymentPolicy family: `walletPublicKey`/`tokenMint` are paired,
 * 1–3 filters allowed (enforced by the route).
 *
 * `userPayment`/`gateway` narrow the RPC call via memcmp; `recipient` and
 * `trackingId` (memo) are post-filtered in JS — see the offset note above.
 */
export async function getComposablePolicyDetails(
  options: PolicyLookupOptions
): Promise<ComposablePolicyDetails[]> {
  const tributary = new Tributary(getConnection(), Keypair.generate());
  const filters = buildComposableFilters(tributary, options);

  const accounts = await tributary.program.account.composablePolicy.all(
    filters
  );

  return accounts
    .filter(({ account }) => {
      if (!options.recipient) return true;
      return (account.recipient as PublicKey).toBase58() === options.recipient;
    })
    .filter(({ account }) => {
      if (!options.trackingId) return true;
      return decodeMemo(account.memo) === options.trackingId;
    })
    .map(({ account, publicKey }) =>
      normalizeComposable(account as ComposablePolicy, publicKey)
    );
}

/**
 * Fetch a single composable policy by its on-chain address (PDA) and
 * normalize it. Delegates to the SDK's `getComposablePolicy`
 * (`program.account.composablePolicy.fetchNullable`).
 */
export async function getComposablePolicyByAddress(
  address: string
): Promise<ComposablePolicyDetails | null> {
  const tributary = new Tributary(getConnection(), Keypair.generate());
  const account = await tributary.getComposablePolicy(new PublicKey(address));
  if (!account) return null;
  return normalizeComposable(
    account as ComposablePolicy,
    new PublicKey(address)
  );
}
