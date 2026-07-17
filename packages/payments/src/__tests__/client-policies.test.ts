// PaymentsClient.policies namespace (rename from .subscriptions) + variant filter.
// Feature tributary-gj27 (milestone tributary-f6yh, Axis 7).

import { PaymentsClient } from "../core/client";
import { PaymentPolicyTracker } from "../core/tracking";

// Build a fake tracker returning canned policies. account.policyType mirrors
// the Anchor-serialized on-chain enum shape ({ subscription: {...} }, etc.)
// and account.status mirrors PolicyStatus ({ active: {} } | { paused: {} } | { completed: {} }).
function fakeTracker(policies: Array<{ account: any }>): any {
  return {
    getPaymentPoliciesForOptions: jest
      .fn()
      .mockResolvedValue(
        policies.map((p, i) => ({ publicKey: `pk${i}`, account: p.account }))
      ),
  };
}

const subPolicy = (status: string = "active") => ({
  account: {
    policyType: { subscription: { amount: 100 } },
    status: { [status]: {} },
    paymentCount: 3,
  },
});
const milestonePolicy = () => ({
  account: {
    policyType: { milestone: { totalMilestones: 2 } },
    status: { active: {} },
    paymentCount: 1,
  },
});
const oneTimePolicy = () => ({
  account: {
    policyType: { oneTime: { amount: 500 } },
    status: { completed: {} },
    paymentCount: 1,
  },
});

const OPTS = { trackingId: "t" };

describe("PaymentsClient.policies (Axis 7)", () => {
  it("checkStatus summarizes matching policies", async () => {
    const client = new PaymentsClient(
      fakeTracker([
        subPolicy(),
        milestonePolicy(),
      ]) as unknown as PaymentPolicyTracker
    );
    const status = await client.policies.checkStatus(OPTS);
    expect(status.total).toBe(2);
    expect(status.active).toBe(2);
  });

  it("isActive returns true when at least one matching policy is active", async () => {
    const client = new PaymentsClient(
      fakeTracker([
        subPolicy("paused"),
        subPolicy("active"),
      ]) as unknown as PaymentPolicyTracker
    );
    expect(await client.policies.isActive(OPTS)).toBe(true);
  });

  it("isActive returns false when none active", async () => {
    const client = new PaymentsClient(
      fakeTracker([subPolicy("completed")]) as unknown as PaymentPolicyTracker
    );
    expect(await client.policies.isActive(OPTS)).toBe(false);
  });

  it("getDetails returns the raw matching policies", async () => {
    const client = new PaymentsClient(
      fakeTracker([
        subPolicy(),
        milestonePolicy(),
      ]) as unknown as PaymentPolicyTracker
    );
    const details = await client.policies.getDetails(OPTS);
    expect(details).toHaveLength(2);
    expect(details[0].account.policyType.subscription).toBeDefined();
  });

  it("honors options.variant filter (subscription only)", async () => {
    const client = new PaymentsClient(
      fakeTracker([
        subPolicy(),
        milestonePolicy(),
        oneTimePolicy(),
      ]) as unknown as PaymentPolicyTracker
    );
    const onlySubs = await client.policies.getDetails({
      ...OPTS,
      variant: "subscription",
    });
    expect(onlySubs).toHaveLength(1);
    expect(onlySubs[0].account.policyType.subscription).toBeDefined();
  });

  it("variant=oneTime filters to oneTime policies", async () => {
    const client = new PaymentsClient(
      fakeTracker([
        subPolicy(),
        oneTimePolicy(),
      ]) as unknown as PaymentPolicyTracker
    );
    const res = await client.policies.getDetails({
      ...OPTS,
      variant: "oneTime",
    });
    expect(res).toHaveLength(1);
    expect(res[0].account.policyType.oneTime).toBeDefined();
  });

  it("variant=payment returns no PaymentPolicies (payments are not policies)", async () => {
    const client = new PaymentsClient(
      fakeTracker([subPolicy()]) as unknown as PaymentPolicyTracker
    );
    const res = await client.policies.getDetails({
      ...OPTS,
      variant: "payment",
    });
    expect(res).toHaveLength(0);
  });

  it("throws a clear error when no tracker was injected", async () => {
    const client = new PaymentsClient();
    await expect(client.policies.checkStatus(OPTS)).rejects.toThrow(/tracker/i);
  });

  it("payments.oneTime stays available (unchanged)", () => {
    const client = new PaymentsClient();
    expect(client.payments.oneTime).toBeDefined();
    expect(typeof client.payments.oneTime.checkStatus).toBe("function");
  });
});

describe("PaymentsClient.subscriptions deprecated alias (Axis 7)", () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => warnSpy.mockRestore());

  it("delegates to .policies and warns", async () => {
    const client = new PaymentsClient(
      fakeTracker([subPolicy()]) as unknown as PaymentPolicyTracker
    );
    const status = await client.subscriptions.checkStatus(OPTS);
    expect(status.total).toBe(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/deprecated|\.policies/i);
  });
});
