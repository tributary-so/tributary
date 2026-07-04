// Cross-package validation parity (TS side).
// Feature tributary-go09 (milestone tributary-f6yh, testing epic, Axis 6).
//
// Asserts the TS validators agree with the canonical fixtures in
// fixtures/policy-configs.ts. The Rust side of the contract is the #[test]
// blocks in programs/tributary/src/policies/*.rs (source of truth); every
// fixture here mirrors a Rust case. Drift on either side -> CI failure.
//
// Live Surfpool round-trip (the bean's "Rust parity test" alternative #2) is
// OPTIONAL and lives in tests/ if added — it requires a running Surfpool and
// is not needed for the TS<->fixtures contract.

import { POLICY_FIXTURES, FixtureCase } from "./fixtures/policy-configs";
import { ValidationUtils, TributaryValidationError } from "../utils/validation";

function runCase({ name, params, expectConstraint }: FixtureCase): void {
  if (!expectConstraint) {
    // valid: must NOT throw
    expect(() => ValidationUtils.validatePolicyConfig(params)).not.toThrow();
    return;
  }
  // invalid: must throw a TributaryValidationError whose constraint matches
  let threw = false;
  try {
    ValidationUtils.validatePolicyConfig(params);
  } catch (e) {
    threw = true;
    const err = e as TributaryValidationError;
    expect(err).toBeInstanceOf(TributaryValidationError);
    const constraint = (err.constraint || "").toLowerCase();
    const expected = expectConstraint.toLowerCase();
    if (!constraint.includes(expected)) {
      throw new Error(
        `[${name}] expected constraint to include "${expected}" but got "${err.constraint}"`
      );
    }
  }
  if (!threw) {
    throw new Error(
      `[${name}] expected validation to throw (constraint: ${expectConstraint})`
    );
  }
}

describe("cross-package validation parity (TS <-> fixtures)", () => {
  it("fixture set covers all 6 modes", () => {
    expect(Object.keys(POLICY_FIXTURES).sort()).toEqual([
      "milestone",
      "oneTime",
      "payAsYouGo",
      "payment",
      "subscription",
      "upTo",
    ]);
  });

  it.each(
    Object.entries(POLICY_FIXTURES).flatMap(([variant, sets]) => [
      ...sets.valid.map((c) => ({ variant, outcome: "valid", case: c })),
      ...sets.invalid.map((c) => ({ variant, outcome: "invalid", case: c })),
    ])
  )("$variant/$outcome/$case.name", ({ case: c }) => {
    runCase(c);
  });

  it("every invalid case carries an expectConstraint", () => {
    for (const [, sets] of Object.entries(POLICY_FIXTURES)) {
      for (const c of sets.invalid) {
        expect(c.expectConstraint).toBeTruthy();
      }
    }
  });
});
