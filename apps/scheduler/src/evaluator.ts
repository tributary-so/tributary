import type { AccountInfo } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import {
  getAssertAccountInfoInstructionDataSerializer,
  getAssertTokenAccountInstructionDataSerializer,
  IntegerOperator,
} from "lighthouse-sdk-legacy";
import type { ComposablePolicy, PaymentGateway } from "@tributary-so/sdk";
import { grossCapToFace } from "@tributary-so/sdk";

export type AssertionFamily = "accountInfo" | "tokenAccount" | "unknown";

// ponytail: Lighthouse instruction discriminator is byte 0 of the assertion
// data (after ValidationPda's Anchor discriminator is stripped by
// parseValidationPda). 5=assertAccountInfo, 9=assertTokenAccount.
// Multi-variant + other families return false (fire path skips).
export function parseAssertionFamily(data: Buffer): AssertionFamily {
  if (data.length < 1) return "unknown";
  switch (data[0]) {
    case 5:
      return "accountInfo";
    case 9:
      return "tokenAccount";
    default:
      return "unknown";
  }
}

export function applyIntegerOperator(
  actual: bigint,
  expected: bigint,
  op: IntegerOperator
): boolean {
  switch (op) {
    case IntegerOperator.Equal:
      return actual === expected;
    case IntegerOperator.NotEqual:
      return actual !== expected;
    case IntegerOperator.GreaterThan:
      return actual > expected;
    case IntegerOperator.LessThan:
      return actual < expected;
    case IntegerOperator.GreaterThanOrEqual:
      return actual >= expected;
    case IntegerOperator.LessThanOrEqual:
      return actual <= expected;
    default:
      return false;
  }
}

export function evaluateAccountInfoAssertion(
  assertion: any,
  account: AccountInfo<Buffer> | null
): boolean {
  if (!account) return false;
  switch (assertion.__kind) {
    case "Lamports":
      return applyIntegerOperator(
        BigInt(account.lamports),
        BigInt((assertion.value as bigint).toString()),
        assertion.operator
      );
    case "DataLength":
      return applyIntegerOperator(
        BigInt(account.data?.length ?? 0),
        BigInt((assertion.value as bigint).toString()),
        assertion.operator
      );
    default:
      return false;
  }
}

export function evaluateTokenAccountAssertion(
  assertion: any,
  account: AccountInfo<Buffer> | null
): boolean {
  if (!account?.data || account.data.length < 72) return false;
  const amount = BigInt(account.data.readBigUInt64LE(64));
  switch (assertion.__kind) {
    case "Amount":
      return applyIntegerOperator(
        amount,
        BigInt((assertion.value as bigint).toString()),
        assertion.operator
      );
    default:
      return false;
  }
}

export function evaluateAssertion(
  family: AssertionFamily,
  assertionData: Buffer,
  account: AccountInfo<Buffer> | null
): boolean {
  if (family === "unknown") return false;
  try {
    if (family === "accountInfo") {
      const [decoded] =
        getAssertAccountInfoInstructionDataSerializer().deserialize(
          assertionData
        );
      return evaluateAccountInfoAssertion(decoded?.assertion, account);
    }
    const [decoded] =
      getAssertTokenAccountInstructionDataSerializer().deserialize(
        assertionData
      );
    return evaluateTokenAccountAssertion(decoded?.assertion, account);
  } catch {
    return false;
  }
}

// ponytail: validation target pubkeys aren't stored on-chain. v1 derives
// them from the policy + assertion family: accountInfo → recipient (system
// account, lamports sensor), tokenAccount → recipient's output-mint ATA
// (token amount sensor). num>1 / unknown → null (skip; fire path can't
// assemble remaining_accounts).
export function deriveValidationTarget(
  family: AssertionFamily,
  policy: ComposablePolicy
): PublicKey | null {
  if (family === "accountInfo") return policy.recipient;
  if (family === "tokenAccount") {
    return getAssociatedTokenAddressSync(
      policy.forwardConfig.outputMint,
      policy.recipient,
      true
    );
  }
  return null;
}

export interface ScheduleReadiness {
  ready: boolean;
  amount: BN | null;
}

export function isScheduleReady(
  policy: ComposablePolicy,
  currentTime: number,
  gatewayAccount: PaymentGateway
): ScheduleReadiness {
  if (!(policy.status as any)?.active) {
    return { ready: false, amount: null };
  }

  const policyType = policy.policyType;

  if (policyType.subscription) {
    const sub = policyType.subscription;
    if (sub.nextPaymentDue.toNumber() > currentTime) {
      return { ready: false, amount: null };
    }
    if (sub.maxRenewals !== null && policy.paymentCount >= sub.maxRenewals) {
      return { ready: false, amount: null };
    }
    // Non-PayAsYouGo: face IS the raw policy amount. On-chain resolves it
    // from the schedule; forward_amount param MUST be null for these
    // (execute_composable rejects Some for non-PayAsYouGo). The `amount`
    // here is only used to build the forward ix face.
    return { ready: true, amount: sub.amount };
  }

  if (policyType.milestone) {
    const ms = policyType.milestone;
    if (ms.releaseCondition !== 0) return { ready: false, amount: null };
    if (ms.currentMilestone >= ms.totalMilestones) {
      return { ready: false, amount: null };
    }
    if (ms.milestoneTimestamps[ms.currentMilestone].toNumber() > currentTime) {
      return { ready: false, amount: null };
    }
    return { ready: true, amount: ms.milestoneAmounts[ms.currentMilestone] };
  }

  if (policyType.payAsYouGo) {
    const payg = policyType.payAsYouGo;
    const maxChunk = payg.maxChunkAmount;
    const feeBps = gatewayAccount.gatewayFeeBps;

    // Detect period rollover: if the period window has elapsed, the
    // on-chain program resets currentPeriodTotal to 0. Mirror that here
    // so the scheduler doesn't skip a ready policy whose stale
    // currentPeriodTotal makes it look exhausted.
    const periodEnd = payg.currentPeriodStart.add(payg.periodLengthSeconds);
    // ponytail: BN.lten() only works for n < 0x4000000 (67M) — unix
    // timestamps far exceed that. Use .lte(new BN(n)) for correct comparison.
    const periodRolledOver = periodEnd.lte(new BN(currentTime));
    const currentTotal = periodRolledOver ? new BN(0) : payg.currentPeriodTotal;

    const remainingPeriod = payg.maxAmountPerPeriod.sub(currentTotal);
    // PayAsYouGo maxChunkAmount binds on GROSS (ADR-0026): convert to face.
    // This is the only variant that passes forward_amount to execute_composable.
    const amount = grossCapToFace(maxChunk, feeBps);
    const freeAmount = amount.gt(remainingPeriod) ? remainingPeriod : amount;

    return {
      ready: freeAmount.gtn(0),
      amount: freeAmount,
    };
  }

  if (policyType.oneTime) {
    const ot = policyType.oneTime;
    // Status flips to Completed after firing, but double-gate on paymentCount.
    if (policy.paymentCount > 0) return { ready: false, amount: null };
    if (ot.dueDate.toNumber() > currentTime) {
      return { ready: false, amount: null };
    }
    if (
      ot.expiryDate !== null &&
      ot.expiryDate.toNumber() > 0 &&
      currentTime > ot.expiryDate.toNumber()
    ) {
      return { ready: false, amount: null };
    }
    return { ready: true, amount: ot.amount };
  }

  // UpTo: cannot be scheduler-driven via composable. The on-chain handler
  // rejects forward_amount=Some for non-PayAsYouGo, and
  // validate_policy_execution requires provided_amount for UpTo — so neither
  // Some nor None works. UpTo settlement is recipient/resource-server
  // triggered, not scheduler-triggered.
  return { ready: false, amount: null };
}
