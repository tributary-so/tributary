import { nextComposablePolicyId } from "../packages/sdk/src/utils";
import type { UserPayment } from "../packages/sdk/src/types";

// ══════════════════════════════════════════════════════════════════════
//  H-6 regression: composable policyId must come from createdComposableCount
//  and NEVER alias to createdPoliciesCount. The two counters are independent
//  namespaces on the same UserPayment PDA; aliasing collides with an
//  existing PaymentPolicy PDA.
// ══════════════════════════════════════════════════════════════════════

describe("nextComposablePolicyId (H-6)", () => {
  function up(
    createdComposableCount: number,
    createdPoliciesCount: number
  ): Pick<UserPayment, "createdComposableCount" | "createdPoliciesCount"> {
    return { createdComposableCount, createdPoliciesCount };
  }

  test("null UserPayment → id 1 (first composable on fresh account)", () => {
    expect(nextComposablePolicyId(null)).toBe(1);
  });

  test("missing createdComposableCount (legacy) → id 1, not createdPoliciesCount+1", () => {
    // Legacy runtime shape — composable counter absent but regular counter is high.
    // Modeled as unknown to bypass the IDL-derived required-field type.
    const legacy = {
      createdPoliciesCount: 7,
    } as unknown as Pick<UserPayment, "createdComposableCount">;
    expect(nextComposablePolicyId(legacy)).toBe(1);
  });

  test("uses createdComposableCount when set, ignores createdPoliciesCount", () => {
    expect(nextComposablePolicyId(up(0, 5))).toBe(1);
    expect(nextComposablePolicyId(up(2, 0))).toBe(3);
  });

  test("the dangerous case: high regular count, low composable count", () => {
    // Pre-fix this returned 100 (colliding with PaymentPolicy #99 PDA).
    // Post-fix must return 4.
    expect(nextComposablePolicyId(up(3, 99))).toBe(4);
  });
});
