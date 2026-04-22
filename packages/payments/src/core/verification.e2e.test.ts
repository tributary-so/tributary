import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  TributaryVerifier,
  PaymentVerificationError,
  SubscriptionVerificationError,
} from "./verification";

const WALLET = "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR";
const RECIPIENT = "BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq";
const GATEWAY = "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4";
const MEMO = "user_123_monthly_premium";
const ISSUER = "https://api.tributary.so";
const AUDIENCE = "tributary-checkout";
const KID = "test-e2e-key-001";

let server: Server;
let baseUrl: string;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let publicJwk: Record<string, unknown>;

before(async () => {
  const { publicKey, privateKey: pk } = await generateKeyPair("ES256", {
    extractable: true,
  });
  privateKey = pk;
  publicJwk = (await exportJWK(publicKey)) as Record<string, unknown>;

  server = createServer((req, res) => {
    if (req.url === "/.well-known/jwks.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          keys: [
            {
              ...publicJwk,
              kid: KID,
              alg: "ES256",
              use: "sig",
            },
          ],
        })
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const addr = server.address();
  if (typeof addr === "object" && addr) {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  } else {
    throw new Error("Failed to start test JWKS server");
  }
});

after(() => {
  server.close();
});

async function issueTestToken(
  payloadOverrides?: Record<string, unknown>,
  signOverrides?: {
    issuer?: string;
    audience?: string;
  }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const defaultPayload = {
    subscriptions: [],
    lastPayments: [
      {
        signature: "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
        slot: 245123456,
        timestamp: now - 100,
        policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
        amount: "100000",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payer: WALLET,
        recipient: RECIPIENT,
        gateway: GATEWAY,
        memo: MEMO,
        recordId: 3,
      },
    ],
  };

  const jwtPayload = { ...defaultPayload, ...payloadOverrides };

  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "ES256", kid: KID, typ: "JWT" })
    .setSubject(WALLET)
    .setIssuer(signOverrides?.issuer ?? ISSUER)
    .setAudience(signOverrides?.audience ?? AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setNotBefore(now)
    .setJti(randomUUID())
    .sign(privateKey);
}

describe("JWT end-to-end: issue -> verify", () => {
  describe("verifyPayment", () => {
    it("should round-trip a one-time payment token", async () => {
      const token = await issueTestToken();
      const verifier = new TributaryVerifier({ baseUrl });
      const payment = await verifier.verifyPayment(token, {
        recipient: RECIPIENT,
        wallet: WALLET,
        memo: MEMO,
      });

      assert.equal(payment.recipient, RECIPIENT);
      assert.equal(payment.payer, WALLET);
      assert.equal(payment.memo, MEMO);
      assert.equal(payment.amount, "100000");
      assert.equal(payment.recordId, 3);
    });

    it("should round-trip with memo that has surrounding whitespace", async () => {
      const token = await issueTestToken({
        lastPayments: [
          {
            signature: "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
            slot: 245123456,
            timestamp: Math.floor(Date.now() / 1000) - 100,
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            amount: "100000",
            tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            payer: WALLET,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            memo: `  ${MEMO}  `,
            recordId: 3,
          },
        ],
      });

      const verifier = new TributaryVerifier({ baseUrl });
      const payment = await verifier.verifyPayment(token, {
        recipient: RECIPIENT,
        wallet: WALLET,
        memo: MEMO,
      });

      assert.equal(payment.memo, `  ${MEMO}  `);
    });

    it("should reject when wallet does not match", async () => {
      const token = await issueTestToken();
      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(
        () =>
          verifier.verifyPayment(token, {
            recipient: RECIPIENT,
            wallet: "WrongWallet1111111111111111111111111111111",
            memo: MEMO,
          }),
        PaymentVerificationError
      );
    });

    it("should reject when memo does not match exactly", async () => {
      const token = await issueTestToken();
      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(
        () =>
          verifier.verifyPayment(token, {
            recipient: RECIPIENT,
            wallet: WALLET,
            memo: "user_123_monthly_premium_extra",
          }),
        PaymentVerificationError
      );
    });

    it("should reject an expired token", async () => {
      const now = Math.floor(Date.now() / 1000);
      const jwtPayload = {
        subscriptions: [],
        lastPayments: [
          {
            signature: "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
            slot: 245123456,
            timestamp: now - 100,
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            amount: "100000",
            tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            payer: WALLET,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            memo: MEMO,
            recordId: 3,
          },
        ],
      };

      const token = await new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: "ES256", kid: KID, typ: "JWT" })
        .setSubject(WALLET)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt(now - 7200)
        .setExpirationTime(now - 3600)
        .setNotBefore(now - 7200)
        .setJti(randomUUID())
        .sign(privateKey);

      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(() =>
        verifier.verifyPayment(token, {
          recipient: RECIPIENT,
          wallet: WALLET,
          memo: MEMO,
        })
      );
    });

    it("should reject a token with wrong issuer", async () => {
      const token = await issueTestToken(
        {},
        { issuer: "https://evil.example.com" }
      );
      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(() =>
        verifier.verifyPayment(token, {
          recipient: RECIPIENT,
          wallet: WALLET,
          memo: MEMO,
        })
      );
    });

    it("should reject a token with wrong audience", async () => {
      const token = await issueTestToken({}, { audience: "wrong-audience" });
      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(() =>
        verifier.verifyPayment(token, {
          recipient: RECIPIENT,
          wallet: WALLET,
          memo: MEMO,
        })
      );
    });

    it("should reject a token signed with RS256 (algorithm confusion)", async () => {
      const rsKeys = await generateKeyPair("RS256", { extractable: true });
      const rsPublicJwk = await exportJWK(rsKeys.publicKey);

      const rogue = createServer((req, res) => {
        if (req.url === "/.well-known/jwks.json") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              keys: [{ ...rsPublicJwk, kid: KID, alg: "RS256", use: "sig" }],
            })
          );
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      await new Promise<void>((resolve) => rogue.listen(0, () => resolve()));
      const rogueAddr = rogue.address();
      const rogueUrl = `http://127.0.0.1:${
        typeof rogueAddr === "object" && rogueAddr ? rogueAddr.port : 0
      }`;

      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({ subscriptions: [], lastPayments: [] })
        .setProtectedHeader({ alg: "RS256", kid: KID, typ: "JWT" })
        .setSubject(WALLET)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .setNotBefore(now)
        .setJti(randomUUID())
        .sign(rsKeys.privateKey);

      const verifier = new TributaryVerifier({ baseUrl: rogueUrl });

      await assert.rejects(() => verifier.verify(token));

      rogue.close();
    });
  });

  describe("verifySubscription", () => {
    const now = Math.floor(Date.now() / 1000);

    it("should round-trip a subscription token", async () => {
      const token = await issueTestToken({
        subscriptions: [
          {
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            policyId: 1,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            amount: "100000",
            paymentFrequency: "monthly",
            totalPayments: 3,
            nextPaymentDue: now + 2592000,
            status: "paid",
            autoRenew: true,
            maxRenewals: null,
            createdAt: now - 86400 * 30,
            memo: "foobar",
          },
        ],
      });

      const verifier = new TributaryVerifier({ baseUrl });
      const sub = await verifier.verifySubscription(token, {
        recipient: RECIPIENT,
        wallet: WALLET,
        memo: MEMO,
      });

      assert.equal(sub.status, "paid");
      assert.equal(sub.recipient, RECIPIENT);
      assert.equal(sub.amount, "100000");
      assert.equal(sub.paymentFrequency, "monthly");
      assert.equal(sub.totalPayments, 3);
    });

    it("should reject subscription when wallet does not match", async () => {
      const token = await issueTestToken({
        subscriptions: [
          {
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            policyId: 1,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            amount: "100000",
            paymentFrequency: "monthly",
            totalPayments: 3,
            nextPaymentDue: now + 2592000,
            status: "paid",
            autoRenew: true,
            maxRenewals: null,
            createdAt: now - 86400 * 30,
            memo: "foobar",
          },
        ],
      });

      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(
        () =>
          verifier.verifySubscription(token, {
            recipient: RECIPIENT,
            wallet: "WrongWallet1111111111111111111111111111111",
            memo: MEMO,
          }),
        SubscriptionVerificationError
      );
    });

    it("should reject when subscription status is overdue", async () => {
      const token = await issueTestToken({
        subscriptions: [
          {
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            policyId: 1,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            amount: "100000",
            paymentFrequency: "monthly",
            totalPayments: 3,
            nextPaymentDue: now + 2592000,
            status: "overdue",
            autoRenew: true,
            maxRenewals: null,
            createdAt: now - 86400 * 30,
            memo: "foobar",
          },
        ],
      });

      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(
        () =>
          verifier.verifySubscription(token, {
            recipient: RECIPIENT,
            wallet: WALLET,
            memo: MEMO,
          }),
        /not paid/
      );
    });

    it("should reject when paid subscription has no matching payment memo", async () => {
      const token = await issueTestToken({
        subscriptions: [
          {
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            policyId: 1,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            amount: "100000",
            paymentFrequency: "monthly",
            totalPayments: 3,
            nextPaymentDue: now + 2592000,
            status: "paid",
            autoRenew: true,
            maxRenewals: null,
            createdAt: now - 86400 * 30,
            memo: "foobar",
          },
        ],
        lastPayments: [
          {
            signature: "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
            slot: 245123456,
            timestamp: now - 100,
            policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
            amount: "100000",
            tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            payer: WALLET,
            recipient: RECIPIENT,
            gateway: GATEWAY,
            memo: "something_else_entirely",
            recordId: 3,
          },
        ],
      });

      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(
        () =>
          verifier.verifySubscription(token, {
            recipient: RECIPIENT,
            wallet: WALLET,
            memo: MEMO,
          }),
        /no payment found with memo/
      );
    });
  });

  describe("payload integrity", () => {
    it("should include jti, nbf, iss, aud, sub, iat, exp in decoded payload", async () => {
      const token = await issueTestToken();
      const verifier = new TributaryVerifier({ baseUrl });
      const payload = await verifier.verify(token);

      assert.ok(payload.jti, "jti should be present");
      assert.equal(typeof payload.jti, "string");
      assert.ok(payload.nbf, "nbf should be present");
      assert.equal(typeof payload.nbf, "number");
      assert.equal(payload.iss, ISSUER);
      assert.equal(payload.aud, AUDIENCE);
      assert.equal(payload.sub, WALLET);
      assert.ok(payload.iat <= Math.floor(Date.now() / 1000));
      assert.ok(payload.exp > Math.floor(Date.now() / 1000));
    });

    it("should reject a token signed with a key not in the JWKS", async () => {
      const rogueKeys = await generateKeyPair("ES256", { extractable: true });

      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({ subscriptions: [], lastPayments: [] })
        .setProtectedHeader({ alg: "ES256", kid: "rogue-key", typ: "JWT" })
        .setSubject(WALLET)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .setNotBefore(now)
        .setJti(randomUUID())
        .sign(rogueKeys.privateKey);

      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(() => verifier.verify(token));
    });

    it("should reject a tampered token (modified payload)", async () => {
      const token = await issueTestToken();
      const parts = token.split(".");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8")
      );
      payload.sub = "TamperedWallet1111111111111111111111111";
      parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");

      const verifier = new TributaryVerifier({ baseUrl });

      await assert.rejects(() => verifier.verify(parts.join(".")));
    });
  });
});
