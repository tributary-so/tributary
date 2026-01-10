import { Request, Response, NextFunction } from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";
import jwt from "jsonwebtoken";

/**
 * x402 v2 Payment Scheme Types
 * Supports both subscription (deferred) and pay-as-you-go (x402://payg) schemes
 */
export type X402Scheme = "deferred" | "x402://payg" | "x402://prepaid";

/**
 * x402 v2 Payment Requirements (sent in Payment-Required header)
 */
export interface X402PaymentRequirements {
  /** Payment scheme (deferred, x402://payg, x402://prepaid) */
  scheme: X402Scheme;
  /** CAIP-2 chain identifier (e.g., "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") */
  network: string;
  /** Payment resource identifier */
  resource: string;
  /** Unique payment identifier */
  id: string;
  /** Terms URL for the payment */
  termsUrl: string;
  /** Payment amount in smallest units (e.g., lamports for USDC) */
  amount: number;
  /** Currency code (e.g., "USDC") */
  currency: string;
  /** Recipient wallet address */
  recipient: string;
  /** Gateway/facilitator address */
  gateway: string;
  /** Token mint address */
  tokenMint: string;
  /** For subscriptions: payment frequency */
  paymentFrequency?: string;
  /** For subscriptions: auto-renew flag */
  autoRenew?: boolean;
  /** For subscriptions: max renewals limit */
  maxRenewals?: number | null;
  /** For pay-as-you-go: maximum amount per period */
  maxAmountPerPeriod?: number;
  /** For pay-as-you-go: period length in seconds */
  periodLengthSeconds?: number;
  /** For pay-as-you-go: maximum chunk amount per request */
  maxChunkAmount?: number;
}

/**
 * x402 v2 Payment Payload (received in Payment header)
 */
export interface X402PaymentPayload {
  /** x402 protocol version (must be 2 for v2) */
  x402Version: number;
  /** Payment scheme */
  scheme: string;
  /** CAIP-2 chain identifier */
  network: string;
  /** Payment identifier (matches the one in requirements) */
  id: string;
  /** Payment payload containing transaction data */
  payload: {
    /** Serialized and base64-encoded transaction */
    serializedTransaction: string;
    /** Optional signature for the transaction */
    signature?: string;
  };
}

/**
 * x402 v2 Response Header Format
 * Uses modern IETF-style headers instead of deprecated X-* headers
 */
export interface X402ResponseHeaders {
  /** Payment-Required: Contains payment requirements when payment is needed */
  "payment-required"?: string;
  /** Payment-Response: Contains payment confirmation details */
  "payment-response"?: string;
  /** Payment-Signature: Contains payment proof signature for verification */
  "payment-signature"?: string;
}

/**
 * x402 v2 Middleware Options
 */
export interface X402Options {
  /** Payment scheme to use */
  scheme: X402Scheme;
  /** CAIP-2 network identifier */
  network: string;
  /** Payment amount in smallest units */
  amount: number;
  /** Recipient wallet address */
  recipient: string;
  /** Gateway/facilitator address */
  gateway: string;
  /** Token mint address */
  tokenMint: string;
  /** Payment frequency for subscriptions */
  paymentFrequency?: string;
  /** Auto-renew flag for subscriptions */
  autoRenew?: boolean;
  /** Max renewals for subscriptions */
  maxRenewals?: number | null;
  /** Max amount per period for pay-as-you-go */
  maxAmountPerPeriod?: number;
  /** Period length in seconds for pay-as-you-go */
  periodLengthSeconds?: number;
  /** Max chunk amount for pay-as-you-go */
  maxChunkAmount?: number;
  /** JWT secret for token generation */
  jwtSecret: string;
  /** Tributary SDK instance */
  sdk: Tributary;
  /** Solana connection */
  connection: Connection;
}

/**
 * Build x402 v2 Payment-Required header value
 * Format: scheme="...", network="...", resource="...", id="...", etc.
 */
function buildPaymentRequiredHeader(
  options: X402Options,
  resource: string,
  subscriptionId: string
): string {
  const parts: string[] = [
    `scheme="${options.scheme}"`,
    `network="${options.network}"`,
    `resource="${resource}"`,
    `id="${subscriptionId}"`,
    `termsUrl="https://tributary.so/terms"`,
    `amount=${options.amount}`,
    `currency="USDC"`,
    `recipient="${options.recipient}"`,
    `gateway="${options.gateway}"`,
    `tokenMint="${options.tokenMint}"`,
  ];

  // Add scheme-specific parameters
  if (options.scheme === "deferred") {
    parts.push(`paymentFrequency="${options.paymentFrequency || "monthly"}"`);
    parts.push(
      `autoRenew=${options.autoRenew !== undefined ? options.autoRenew : true}`
    );
    if (options.maxRenewals !== undefined && options.maxRenewals !== null) {
      parts.push(`maxRenewals=${options.maxRenewals}`);
    }
  } else if (options.scheme === "x402://payg") {
    if (options.maxAmountPerPeriod !== undefined) {
      parts.push(`maxAmountPerPeriod=${options.maxAmountPerPeriod}`);
    }
    if (options.periodLengthSeconds !== undefined) {
      parts.push(`periodLengthSeconds=${options.periodLengthSeconds}`);
    }
    if (options.maxChunkAmount !== undefined) {
      parts.push(`maxChunkAmount=${options.maxChunkAmount}`);
    }
  }

  return parts.join(", ");
}

/**
 * Parse x402 v2 Payment header
 */
function parsePaymentHeader(headerValue: string): X402PaymentPayload | null {
  try {
    // The Payment header contains base64-encoded JSON
    const decoded = Buffer.from(headerValue, "base64").toString("utf-8");
    return JSON.parse(decoded) as X402PaymentPayload;
  } catch (e) {
    console.error("Failed to parse Payment header:", e);
    return null;
  }
}

/**
 * Build x402 v2 Payment-Response header value
 */
function buildPaymentResponseHeader(
  scheme: string,
  network: string,
  id: string,
  timestamp: number
): string {
  return `scheme="${scheme}", network="${network}", id="${id}", timestamp=${timestamp}`;
}

/**
 * Verify subscription payment (for v2 deferred scheme)
 */
async function verifySubscriptionCreation(
  sdk: Tributary,
  userPublicKey: PublicKey,
  expectedAmount: number,
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

    if (userPaymentPolicies.length === 0) {
      return { success: false, error: "No payment policies found for user" };
    }

    const latestPolicy = userPaymentPolicies.sort((a, b) =>
      b.account.createdAt.sub(a.account.createdAt).toNumber()
    )[0];

    const policy = latestPolicy.account;
    const policyAddress = latestPolicy.publicKey;

    if (Object.keys(policy.status)[0] !== "active") {
      return {
        success: false,
        error: `Policy status is ${policy.status}, expected active`,
      };
    }

    const policyAmount = policy.policyType.subscription?.amount.toNumber() || 0;
    if (policyAmount !== expectedAmount) {
      return {
        success: false,
        error: `Policy amount ${policyAmount} does not match expected ${expectedAmount}`,
      };
    }

    const userPayment = await sdk.getUserPayment(policy.userPayment);
    if (!userPayment || !userPayment.tokenMint.equals(expectedTokenMint)) {
      return {
        success: false,
        error: `Token mint does not match expected`,
      };
    }

    if (!policy.gateway.equals(expectedGateway)) {
      return {
        success: false,
        error: `Gateway does not match expected`,
      };
    }

    if (!policy.recipient.equals(expectedRecipient)) {
      return {
        success: false,
        error: `Recipient does not match expected`,
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
 * Verify pay-as-you-go payment (for v2 x402://payg scheme)
 */
async function verifyPayAsYouGoPayment(
  sdk: Tributary,
  userPublicKey: PublicKey,
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

    // Find the most recent active pay-as-you-go policy
    const paygPolicies = userPaymentPolicies.filter((p) => {
      const policyType = p.account.policyType;
      return (
        "payAsYouGo" in policyType &&
        Object.keys(p.account.status)[0] === "active"
      );
    });

    if (paygPolicies.length === 0) {
      return {
        success: false,
        error: "No pay-as-you-go policies found for user",
      };
    }

    const latestPolicy = paygPolicies.sort((a, b) =>
      b.account.createdAt.sub(a.account.createdAt).toNumber()
    )[0];

    const policy = latestPolicy.account;
    const policyAddress = latestPolicy.publicKey;

    const userPayment = await sdk.getUserPayment(policy.userPayment);
    if (!userPayment || !userPayment.tokenMint.equals(expectedTokenMint)) {
      return {
        success: false,
        error: `Token mint does not match expected`,
      };
    }

    if (!policy.gateway.equals(expectedGateway)) {
      return {
        success: false,
        error: `Gateway does not match expected`,
      };
    }

    if (!policy.recipient.equals(expectedRecipient)) {
      return {
        success: false,
        error: `Recipient does not match expected`,
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

export function createX402Middleware(options: X402Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check for JWT in Authorization header (Bearer token)
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, options.jwtSecret) as {
          policyAddress: string;
          scheme: string;
          subscriptionId: string;
          amount: number;
          recipient: string;
          gateway: string;
          maxAmountPerPeriod?: number;
          periodLengthSeconds?: number;
        };

        // Verify policy exists and is valid based on scheme type
        const policy = await options.sdk.getPaymentPolicy(
          new PublicKey(decoded.policyAddress)
        );

        if (policy) {
          const isActive = Object.keys(policy.status)[0] === "active";

          if (isActive) {
            // For pay-as-you-go, also check period limits
            if (decoded.scheme === "x402://payg") {
              const paygData = policy.policyType.payAsYouGo;
              if (paygData) {
                const now = Date.now() / 1000;
                const periodEnd =
                  paygData.currentPeriodStart.toNumber() +
                  paygData.periodLengthSeconds.toNumber();
                const withinLimit =
                  paygData.currentPeriodTotal.toNumber() <
                  paygData.maxAmountPerPeriod.toNumber();

                if (now < periodEnd && withinLimit) {
                  // Attach policy info to request for downstream use
                  (req as any).x402Policy = {
                    policyAddress: decoded.policyAddress,
                    scheme: decoded.scheme,
                    remainingBudget:
                      paygData.maxAmountPerPeriod.toNumber() -
                      paygData.currentPeriodTotal.toNumber(),
                    periodEnd,
                  };
                  return next();
                } else {
                  // Period exhausted, require new payment
                  return res
                    .status(402)
                    .set(
                      "payment-required",
                      buildPaymentRequiredHeader(
                        options,
                        `${req.protocol}://${req.get("host")}${
                          req.originalUrl
                        }`,
                        `payg_${Date.now()}_${Math.random()
                          .toString(36)
                          .slice(2)}`
                      )
                    )
                    .json({ error: "Pay-as-you-go period exhausted" });
                }
              }
            } else {
              // Subscription - active and valid
              (req as any).x402Policy = {
                policyAddress: decoded.policyAddress,
                scheme: decoded.scheme,
              };
              return next();
            }
          }
        }

        return res
          .status(402)
          .set(
            "payment-required",
            buildPaymentRequiredHeader(
              options,
              `${req.protocol}://${req.get("host")}${req.originalUrl}`,
              `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`
            )
          )
          .json({ error: "Invalid or inactive subscription" });
      } catch (e) {
        console.error("JWT verification error:", e);
        return res.status(401).json({ error: "Invalid JWT token" });
      }
    }

    // 2. Check for Payment header (x402 v2 format)
    const paymentHeader = req.header("Payment");
    if (paymentHeader) {
      try {
        const paymentData = parsePaymentHeader(paymentHeader);

        if (!paymentData) {
          return res
            .status(400)
            .json({ error: "Invalid Payment header format" });
        }

        // Validate x402 version
        if (paymentData.x402Version !== 2) {
          return res.status(400).json({
            error: `x402 v2 required, got v${paymentData.x402Version}`,
          });
        }

        // Validate scheme
        if (paymentData.scheme !== options.scheme) {
          throw new Error(`Only ${options.scheme} scheme is supported`);
        }

        // Validate network
        if (paymentData.network !== options.network) {
          throw new Error(`Only ${options.network} network is supported`);
        }

        console.log(`Received ${paymentData.scheme} payment from client`);
        console.log(`  Network: ${paymentData.network}`);
        console.log(`  ID: ${paymentData.id}`);

        // Deserialize the transaction
        const txBuffer = Buffer.from(
          paymentData.payload.serializedTransaction,
          "base64"
        );
        const tx = Transaction.from(txBuffer);

        // Extract the signer (user)
        const userPublicKey = tx.feePayer!;

        // Pre-verify existing payment based on scheme type
        let preVerification: { success: boolean; policyAddress?: PublicKey };

        if (options.scheme === "deferred") {
          preVerification = await verifySubscriptionCreation(
            options.sdk,
            userPublicKey,
            options.amount,
            new PublicKey(options.tokenMint),
            new PublicKey(options.gateway),
            new PublicKey(options.recipient)
          );
        } else if (options.scheme === "x402://payg") {
          preVerification = await verifyPayAsYouGoPayment(
            options.sdk,
            userPublicKey,
            new PublicKey(options.tokenMint),
            new PublicKey(options.gateway),
            new PublicKey(options.recipient)
          );
        } else {
          preVerification = { success: false };
        }

        if (preVerification.success) {
          console.log("✓ Existing payment found, returning JWT early");

          // Create JWT for existing subscription/policy
          const token = jwt.sign(
            {
              policyAddress: preVerification.policyAddress?.toBase58(),
              scheme: options.scheme,
              subscriptionId: paymentData.id,
              amount: options.amount,
              recipient: options.recipient,
              gateway: options.gateway,
              maxAmountPerPeriod: options.maxAmountPerPeriod,
              periodLengthSeconds: options.periodLengthSeconds,
            },
            options.jwtSecret,
            { expiresIn: "1y" }
          );

          const timestamp = Date.now();
          res.set(
            "payment-response",
            buildPaymentResponseHeader(
              options.scheme,
              options.network,
              paymentData.id,
              timestamp
            )
          );

          return res.json({
            jwt: token,
            message: `Existing ${options.scheme} payment verified. Use JWT for future access.`,
            paymentDetails: {
              policyAddress: preVerification.policyAddress?.toBase58(),
              scheme: options.scheme,
              id: paymentData.id,
            },
          });
        }

        // Simulate the transaction
        console.log("Simulating transaction...");
        const simulation = await options.connection.simulateTransaction(tx);
        if (simulation.value.err) {
          console.error("Simulation failed:", simulation.value.err);
          return res.status(402).json({
            error: "Transaction simulation failed",
            details: simulation.value.err,
          });
        }
        console.log("  ✓ Simulation successful");

        // Submit the transaction
        console.log("Submitting transaction to network...");
        const signature = await options.connection.sendRawTransaction(
          txBuffer,
          {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          }
        );

        console.log(`Transaction submitted: ${signature}`);

        // Wait for confirmation
        const confirmation = await options.connection.confirmTransaction(
          signature,
          "confirmed"
        );
        if (confirmation.value.err) {
          return res.status(402).json({
            error: "Transaction failed on-chain",
            details: confirmation.value.err,
          });
        }

        // Verify payment was created based on scheme type
        let verification: {
          success: boolean;
          error?: string;
          policyAddress?: PublicKey;
        };

        if (options.scheme === "deferred") {
          verification = await verifySubscriptionCreation(
            options.sdk,
            userPublicKey,
            options.amount,
            new PublicKey(options.tokenMint),
            new PublicKey(options.gateway),
            new PublicKey(options.recipient)
          );
        } else if (options.scheme === "x402://payg") {
          verification = await verifyPayAsYouGoPayment(
            options.sdk,
            userPublicKey,
            new PublicKey(options.tokenMint),
            new PublicKey(options.gateway),
            new PublicKey(options.recipient)
          );
        } else {
          verification = { success: false, error: "Unsupported scheme" };
        }

        if (!verification.success) {
          return res.status(402).json({
            error: "Payment verification failed",
            details: verification.error,
          });
        }

        console.log("✓ Payment verified");

        // Create JWT
        const token = jwt.sign(
          {
            policyAddress: verification.policyAddress?.toBase58(),
            scheme: options.scheme,
            subscriptionId: paymentData.id,
            amount: options.amount,
            recipient: options.recipient,
            gateway: options.gateway,
            maxAmountPerPeriod: options.maxAmountPerPeriod,
            periodLengthSeconds: options.periodLengthSeconds,
          },
          options.jwtSecret,
          { expiresIn: "1y" }
        );

        const timestamp = Date.now();
        res.set(
          "payment-response",
          buildPaymentResponseHeader(
            options.scheme,
            options.network,
            paymentData.id,
            timestamp
          )
        );

        return res.json({
          jwt: token,
          message: `${options.scheme} payment created successfully. Use JWT for future access.`,
          paymentDetails: {
            signature,
            policyAddress: verification.policyAddress?.toBase58(),
            scheme: options.scheme,
            id: paymentData.id,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          },
        });
      } catch (e) {
        console.error("Payment processing error:", e);
        return res.status(402).json({
          error: "Payment processing failed",
          details: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    // 3. Return 402 Payment Required with Payment-Required header (x402 v2 format)
    console.log(`New ${options.scheme} payment quote requested`);

    const randomString = Math.random().toString(36).slice(2);
    const paymentId = `${
      options.scheme === "x402://payg" ? "payg" : "sub"
    }_${Date.now()}_${randomString}`;
    const resource = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    // Set the Payment-Required header (x402 v2 standard)
    res.set(
      "payment-required",
      buildPaymentRequiredHeader(options, resource, paymentId)
    );

    return res.status(402).json({
      accepts: [
        {
          scheme: options.scheme,
          network: options.network,
          resource,
          id: paymentId,
          termsUrl: "https://tributary.so/terms",
          amount: options.amount,
          currency: "USDC",
          recipient: options.recipient,
          gateway: options.gateway,
          tokenMint: options.tokenMint,
          paymentFrequency: options.paymentFrequency,
          autoRenew: options.autoRenew,
          maxRenewals: options.maxRenewals,
          maxAmountPerPeriod: options.maxAmountPerPeriod,
          periodLengthSeconds: options.periodLengthSeconds,
          maxChunkAmount: options.maxChunkAmount,
        },
      ],
    });
  };
}
