/**
 * x402 `upto` scheme — single-use, time-bound variable-amount authorization.
 *
 * Two-phase facilitator flow (see ADR-0020):
 *   1. **Verify** — client creates an UpTo policy on-chain (max, validAfter,
 *      deadline, recipient, gateway) + approves the UserPayment delegate and
 *      presents the creation tx in the Payment header. The facilitator
 *      submits the tx, then calls `verifyUpToAuthorization()` to confirm the
 *      on-chain policy matches the expected ceiling. The verify-time
 *      `X402PaymentRequirements.amount` is the max authorization (ceiling).
 *   2. **Settle** — after resource consumption, the resource server computes
 *      `actual = min(usage_cost, max)` and calls `settleUpTo()`. On-chain
 *      re-checks `actual <= max` and the time window; the policy transitions
 *      `Active → Completed` (single-use).
 *
 * The facilitator MUST read `maxAmount` from the on-chain policy — never from
 * the settle-time `requirements.amount` (which is the actual settle amount,
 * not the ceiling). The on-chain policy is immutable post-create, so the
 * settle-time caller cannot inflate it.
 */

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Tributary } from "@tributary-so/sdk";
import type { PaymentPolicy } from "@tributary-so/sdk";

/**
 * Verify an UpTo authorization against expected parameters. Called by the
 * facilitator after the client's creation tx lands (verify phase).
 *
 * At verify time, `expectedMaxAmount` is the authorization ceiling (the
 * `amount` field in `X402PaymentRequirements` during verify).
 */
export async function verifyUpToAuthorization(
  sdk: Tributary,
  userPublicKey: PublicKey,
  expectedMaxAmount: number,
  expectedTokenMint: PublicKey,
  expectedGateway: PublicKey,
  expectedRecipient: PublicKey
): Promise<{ success: boolean; error?: string; policyAddress?: PublicKey }> {
  try {
    const userPaymentPda = sdk.getUserPaymentPda(
      userPublicKey,
      expectedTokenMint
    );
    const userPaymentPolicies = await sdk.getPaymentPoliciesByUser(
      userPaymentPda.address
    );

    // Find the most recent active UpTo policy
    const uptoPolicies = userPaymentPolicies.filter(
      (p: { publicKey: PublicKey; account: PaymentPolicy }) => {
        const policyType = p.account.policyType;
        return (
          "upTo" in policyType && Object.keys(p.account.status)[0] === "active"
        );
      }
    );

    if (uptoPolicies.length === 0) {
      return {
        success: false,
        error: "No active upto policies found for user",
      };
    }

    const latestPolicy = uptoPolicies.sort(
      (
        a: { publicKey: PublicKey; account: PaymentPolicy },
        b: { publicKey: PublicKey; account: PaymentPolicy }
      ) => b.account.createdAt.sub(a.account.createdAt).toNumber()
    )[0];

    const policy = latestPolicy.account;
    const policyAddress = latestPolicy.publicKey;

    // Recipient / gateway / mint binding
    const userPayment = await sdk.getUserPayment(policy.userPayment);
    if (!userPayment || !userPayment.tokenMint.equals(expectedTokenMint)) {
      return { success: false, error: "Token mint does not match expected" };
    }
    if (!policy.gateway.equals(expectedGateway)) {
      return { success: false, error: "Gateway does not match expected" };
    }
    if (!policy.recipient.equals(expectedRecipient)) {
      return { success: false, error: "Recipient does not match expected" };
    }

    // Ceiling check — reads maxAmount from the on-chain policy (immutable
    // post-create). The facilitator MUST NOT trust the settle-time amount.
    const policyMax = policy.policyType.upTo?.maxAmount.toNumber() ?? 0;
    if (policyMax !== expectedMaxAmount) {
      return {
        success: false,
        error: `Policy max ${policyMax} does not match expected ${expectedMaxAmount}`,
      };
    }

    return { success: true, policyAddress };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown verification error",
    };
  }
}

/**
 * Settle an UpTo authorization with the actual amount (determined by the
 * resource server after usage). On-chain enforces `0 <= actual <= max` and
 * the `[validAfter, deadline)` window. Returns instructions for the
 * facilitator to sign+send.
 *
 * `actualAmount` MAY be 0 (no usage → no charge). The authorization is
 * consumed regardless (single-use transition to `Completed`).
 */
export async function settleUpTo(
  sdk: Tributary,
  policyPda: PublicKey,
  actualAmount: number | BN
): Promise<ReturnType<Tributary["executePayment"]>> {
  const amountBn =
    actualAmount instanceof BN ? actualAmount : new BN(actualAmount);
  return sdk.executePayment(policyPda, amountBn);
}
