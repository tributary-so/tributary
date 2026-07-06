// @ts-nocheck
/**
 * Integration test: sdk-react `issuePolicyToken` ↔ API `/v1/tokens/issue`.
 *
 * Mocks `fetch` to exercise the polling helper's contract:
 *   - success path returns `{ token, expiresAt }`
 *   - 404 polls (slot lag)
 *   - non-404 surfaces immediately
 *   - timeout throws
 *
 * Lives in apps/api (not packages/sdk-react) because jest is configured here
 * and the contract under test is the API helper ↔ API endpoint shape.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { PublicKey } from "@solana/web3.js";

// Stub the React/web3 deps sdk-react re-exports — we only need issuePolicyToken.
jest.mock("@tributary-so/sdk", () => ({}));
jest.mock("@tributary-so/payments", () => ({}));
jest.mock("@solana/wallet-adapter-react", () => ({}));
jest.mock("@solana/wallet-adapter-react-ui", () => ({}));
jest.mock("@coral-xyz/anchor", () => ({}));
jest.mock("@heroui/button", () => ({}));
jest.mock("@actioncodes/sdk", () => ({ default: class {}, Environment: {} }));
jest.mock("lucide-react", () => ({}));

import { issuePolicyToken } from "@tributary-so/sdk-react";

const WALLET = new PublicKey("7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR");
const RECIPIENT = new PublicKey("9xKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVqR");
const TOKEN_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const POLICY_ADDR = new PublicKey(
  "Ehovxr4h5LnsqL6dv2ZR9c1b6L8h9WDTkx5cWq5cQ8wK"
);

const originalFetch = globalThis.fetch;

function mockFetch(responses: Array<{ status: number; body?: any }>) {
  let i = 0;
  const fetchMock = jest.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: r.status === 404 ? "Not Found" : "OK",
      json: async () => r.body,
      text: async () =>
        typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {}),
    } as any;
  });
  // ponytail: global fetch; restore in afterEach.
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("issuePolicyToken — polling helper contract", () => {
  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Squash polling delay so tests run fast.
    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return null as any;
    });
  });

  it("returns {token, expiresAt} on first 200", async () => {
    const fetchMock = mockFetch([
      { status: 200, body: { token: "jwt-abc", expiresAt: 9999 } },
    ]);

    const result = await issuePolicyToken({
      walletPublicKey: WALLET,
      apiBaseUrl: "https://api.test",
      recipient: RECIPIENT,
    });

    expect(result).toEqual({ token: "jwt-abc", expiresAt: 9999 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("https://api.test/v1/tokens/issue");
    const opts = call[1];
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });
    const body = JSON.parse(opts.body);
    expect(body.walletPublicKey).toBe(WALLET.toString());
    expect(body.recipient).toBe(RECIPIENT.toString());
  });

  it("passes policyAddress, tokenMint, trackingId when provided", async () => {
    const fetchMock = mockFetch([
      { status: 200, body: { token: "jwt", expiresAt: 1 } },
    ]);

    await issuePolicyToken({
      walletPublicKey: WALLET,
      apiBaseUrl: "https://api.test/",
      tokenMint: TOKEN_MINT,
      policyAddress: POLICY_ADDR,
      trackingId: "order-42",
    });

    // Trailing slash on apiBaseUrl must be stripped.
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/v1/tokens/issue");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tokenMint).toBe(TOKEN_MINT.toString());
    expect(body.policyAddress).toBe(POLICY_ADDR.toString());
    expect(body.trackingId).toBe("order-42");
  });

  it("polls on 404 then succeeds", async () => {
    const fetchMock = mockFetch([
      { status: 404 },
      { status: 404 },
      { status: 200, body: { token: "late", expiresAt: 7 } },
    ]);

    const result = await issuePolicyToken({
      walletPublicKey: WALLET,
      apiBaseUrl: "https://api.test",
      timeoutMs: 10_000,
    });

    expect(result.token).toBe("late");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("surfaces non-404 errors immediately with body", async () => {
    mockFetch([
      { status: 422, body: { error: "PaymentRecord payer mismatch" } },
    ]);

    await expect(
      issuePolicyToken({
        walletPublicKey: WALLET,
        apiBaseUrl: "https://api.test",
      })
    ).rejects.toThrow(/422/);
  });

  it("surfaces 500 immediately", async () => {
    mockFetch([{ status: 500, body: "boom" }]);

    await expect(
      issuePolicyToken({
        walletPublicKey: WALLET,
        apiBaseUrl: "https://api.test",
      })
    ).rejects.toThrow(/500/);
  });

  it("throws on timeout when only 404s arrive", async () => {
    mockFetch([{ status: 404 }]);

    await expect(
      issuePolicyToken({
        walletPublicKey: WALLET,
        apiBaseUrl: "https://api.test",
        timeoutMs: 0, // expired immediately
      })
    ).rejects.toThrow(/Timed out/);
  });
});
