// @ts-nocheck
import { CheckoutSessionManager } from "../core/session";

describe("CheckoutSessionManager cluster round-trip", () => {
  const manager = new CheckoutSessionManager();

  const baseSubscription = {
    mode: "subscription" as const,
    tokenMint: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    amount: 10,
    autoRenew: true,
    maxRenewals: null,
    paymentFrequency: "monthly",
    startTime: null,
    trackingId: "trib_test",
    lineItems: [],
    successUrl: undefined,
    cancelUrl: undefined,
  };

  const baseOneTime = {
    mode: "payment" as const,
    tokenMint: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    amount: 10,
    trackingId: "trib_test",
    successUrl: undefined,
    cancelUrl: undefined,
  };

  it("defaults to mainnet when cluster is omitted (subscription)", () => {
    const url = manager.encodeUrl(baseSubscription);
    const blob = url.split("/subscribe/")[1];
    const decoded = manager.decodeUrl(blob);
    expect(decoded.cluster).toBe("mainnet");
  });

  it("defaults to mainnet when cluster is omitted (one-time)", () => {
    const url = manager.encodeUrl(baseOneTime);
    const blob = url.split("/pay/")[1];
    const decoded = manager.decodeUrl(blob);
    expect(decoded.cluster).toBe("mainnet");
  });

  it("round-trips an explicit devnet cluster (subscription)", () => {
    const url = manager.encodeUrl({ ...baseSubscription, cluster: "devnet" });
    const blob = url.split("/subscribe/")[1];
    const decoded = manager.decodeUrl(blob);
    expect(decoded.cluster).toBe("devnet");
  });

  it("round-trips an explicit devnet cluster (one-time)", () => {
    const url = manager.encodeUrl({ ...baseOneTime, cluster: "devnet" });
    const blob = url.split("/pay/")[1];
    const decoded = manager.decodeUrl(blob);
    expect(decoded.cluster).toBe("devnet");
  });

  it("falls back to mainnet when encoded cluster is garbage", () => {
    const url = manager.encodeUrl({ ...baseSubscription, cluster: "devnet" });
    const blob = url.split("/subscribe/")[1];
    // Tamper: inject an invalid cluster value into the decoded blob.
    // Decode → mutate → re-encode by hand to simulate a malformed link.
    const tampered = blob + "|c=fake";
    // Easiest path: encode raw JSON with a bad cluster, base64url it.
    const bad = Buffer.from(
      JSON.stringify({
        m: "subscription",
        tm: baseSubscription.tokenMint,
        r: baseSubscription.recipient,
        g: baseSubscription.gateway,
        a: "10",
        pf: "monthly",
        tid: "trib_test",
        su: "null",
        cu: "null",
        c: "not-a-cluster",
      })
    ).toString("base64");
    const decoded = manager.decodeUrl(bad);
    expect(decoded.cluster).toBe("mainnet");
  });
});
