// Self-check for combined-filter memcmp offsets (tributary-wfhx).
//
// Constructs a real Tributary instance (IDL loads from target/), replaces
// program.account.X.all with a capture spy, calls the public methods,
// and asserts the exact GetProgramAccountsFilter arrays that were passed.
//
// Run: npx tsx --test src/__tests__/combined-filters.test.ts

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Tributary } from "../sdk";

// Deterministic test keys (any valid base58 works — we only need objects
// whose .toBase58() round-trips for memcmp bytes comparison).
const USER_PAYMENT = new PublicKey(
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
);
const GATEWAY = new PublicKey("4Nd1mYbz1NQYxoCKAwSVBz6NXRvV8HgqQzaHWwCLo7Rb");
const RECIPIENT = new PublicKey("GThUX1ZkoLtEGduy3FwBDbhZsBH2yHtCAJqZ7L3FgWxR");
const TRACKING_ID = "order-123";

let sdk: Tributary;
let paymentCalls: any[] = [];
let composableCalls: any[] = [];

before(() => {
  const conn = new Connection("http://localhost:8899");
  const wallet = Keypair.generate();
  sdk = new Tributary(conn, wallet);

  // Capture filters passed to all()
  (sdk.program.account as any).paymentPolicy = {
    all: (filters?: any) => {
      paymentCalls.push(filters ?? []);
      return Promise.resolve([]);
    },
  };
  (sdk.program.account as any).composablePolicy = {
    all: (filters?: any) => {
      composableCalls.push(filters ?? []);
      return Promise.resolve([]);
    },
  };
});

describe("getPaymentPolicies", () => {
  it("no filters → empty array", async () => {
    paymentCalls = [];
    await sdk.getPaymentPolicies();
    assert.equal(paymentCalls.length, 1);
    assert.deepEqual(paymentCalls[0], []);
  });

  it("userPayment → offset 8", async () => {
    paymentCalls = [];
    await sdk.getPaymentPolicies({ userPayment: USER_PAYMENT });
    assert.equal(paymentCalls[0].length, 1);
    assert.equal(paymentCalls[0][0].memcmp.offset, 8);
    assert.equal(paymentCalls[0][0].memcmp.bytes, USER_PAYMENT.toBase58());
  });

  it("recipient → offset 40", async () => {
    paymentCalls = [];
    await sdk.getPaymentPolicies({ recipient: RECIPIENT });
    assert.equal(paymentCalls[0][0].memcmp.offset, 40);
    assert.equal(paymentCalls[0][0].memcmp.bytes, RECIPIENT.toBase58());
  });

  it("gateway → offset 72", async () => {
    paymentCalls = [];
    await sdk.getPaymentPolicies({ gateway: GATEWAY });
    assert.equal(paymentCalls[0][0].memcmp.offset, 72);
    assert.equal(paymentCalls[0][0].memcmp.bytes, GATEWAY.toBase58());
  });

  it("trackingId → offset 234 (memo [u8;64])", async () => {
    paymentCalls = [];
    await sdk.getPaymentPolicies({ trackingId: TRACKING_ID });
    assert.equal(paymentCalls[0].length, 1);
    assert.equal(paymentCalls[0][0].memcmp.offset, 234);
    assert.equal(typeof paymentCalls[0][0].memcmp.bytes, "string");
    assert.ok(paymentCalls[0][0].memcmp.bytes.length > 0);
  });

  it("multi-filter combination", async () => {
    paymentCalls = [];
    await sdk.getPaymentPolicies({
      userPayment: USER_PAYMENT,
      gateway: GATEWAY,
      trackingId: TRACKING_ID,
    });
    assert.equal(paymentCalls[0].length, 3);
    assert.equal(paymentCalls[0][0].memcmp.offset, 8);
    assert.equal(paymentCalls[0][1].memcmp.offset, 72);
    assert.equal(paymentCalls[0][2].memcmp.offset, 234);
  });
});

describe("getComposablePolicies", () => {
  it("no filters → empty array", async () => {
    composableCalls = [];
    await sdk.getComposablePolicies();
    assert.equal(composableCalls.length, 1);
    assert.deepEqual(composableCalls[0], []);
  });

  it("userPayment → offset 9 (after bump)", async () => {
    composableCalls = [];
    await sdk.getComposablePolicies({ userPayment: USER_PAYMENT });
    assert.equal(composableCalls[0].length, 1);
    assert.equal(composableCalls[0][0].memcmp.offset, 9);
    assert.equal(composableCalls[0][0].memcmp.bytes, USER_PAYMENT.toBase58());
  });

  it("gateway → offset 41", async () => {
    composableCalls = [];
    await sdk.getComposablePolicies({ gateway: GATEWAY });
    assert.equal(composableCalls[0][0].memcmp.offset, 41);
    assert.equal(composableCalls[0][0].memcmp.bytes, GATEWAY.toBase58());
  });

  it("trackingId → offset 506 (memo [u8;32])", async () => {
    composableCalls = [];
    await sdk.getComposablePolicies({ trackingId: TRACKING_ID });
    assert.equal(composableCalls[0].length, 1);
    assert.equal(composableCalls[0][0].memcmp.offset, 506);
    assert.equal(typeof composableCalls[0][0].memcmp.bytes, "string");
    assert.ok(composableCalls[0][0].memcmp.bytes.length > 0);
  });

  it("recipient → offset 538 (end of struct)", async () => {
    composableCalls = [];
    await sdk.getComposablePolicies({ recipient: RECIPIENT });
    assert.equal(composableCalls[0][0].memcmp.offset, 538);
    assert.equal(composableCalls[0][0].memcmp.bytes, RECIPIENT.toBase58());
  });

  it("multi-filter combination", async () => {
    composableCalls = [];
    await sdk.getComposablePolicies({
      userPayment: USER_PAYMENT,
      gateway: GATEWAY,
      trackingId: TRACKING_ID,
      recipient: RECIPIENT,
    });
    assert.equal(composableCalls[0].length, 4);
    assert.equal(composableCalls[0][0].memcmp.offset, 9);
    assert.equal(composableCalls[0][1].memcmp.offset, 41);
    assert.equal(composableCalls[0][2].memcmp.offset, 506);
    assert.equal(composableCalls[0][3].memcmp.offset, 538);
  });
});

describe("offset divergence between families", () => {
  it("user_payment offset differs (8 vs 9)", async () => {
    paymentCalls = [];
    composableCalls = [];
    await sdk.getPaymentPolicies({ userPayment: USER_PAYMENT });
    await sdk.getComposablePolicies({ userPayment: USER_PAYMENT });
    assert.notEqual(
      paymentCalls[0][0].memcmp.offset,
      composableCalls[0][0].memcmp.offset
    );
    assert.equal(paymentCalls[0][0].memcmp.offset, 8);
    assert.equal(composableCalls[0][0].memcmp.offset, 9);
  });
});
