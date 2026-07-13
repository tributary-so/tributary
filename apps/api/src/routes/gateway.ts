import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import {
  createChallenge,
  verifyGatewayAuthority,
  issueGatewayToken,
  getChallenge,
} from "../services/gateway-auth";
import { requireGatewayAuth } from "../middleware/gateway-auth";
import {
  listMerchantPolicies,
  listMerchantSubscribers,
  getMerchantRevenue,
  listGatewayPayments,
  type MerchantPolicy,
  type MerchantSubscriber,
  type MerchantRevenue,
} from "../db/merchant";

const router: ExpressRouter = Router();

function isValidSolanaPubkey(s: string | undefined): s is string {
  if (!s || s.length < 32 || s.length > 44) return false;
  try {
    // base58 charset check (cheap)
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
  } catch {
    return false;
  }
}

function parseLimit(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return 100;
  return Math.min(n, 1000);
}

function parseOffset(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return 0;
  return n;
}

// ─── Auth: challenge / verify ──────────────────────────────────────────────

/**
 * @openapi
 * /v1/gateway/{gateway}/auth/challenge:
 *   post:
 *     summary: Request a sign-in challenge
 *     tags: [GatewayAuth]
 *     parameters:
 *       - { in: path, name: gateway, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Challenge issued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [nonce, gateway, expiresAt]
 *               properties:
 *                 nonce: { type: string }
 *                 gateway: { type: string }
 *                 expiresAt: { type: integer }
 */
router.post("/:gateway/auth/challenge", async (req, res, next) => {
  try {
    const gateway = req.params.gateway;
    if (!isValidSolanaPubkey(gateway)) {
      return res.status(400).json({ error: "Invalid gateway pubkey" });
    }
    const challenge = createChallenge(gateway);
    res.json(challenge);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/gateway/{gateway}/auth/verify:
 *   post:
 *     summary: Verify wallet signature and issue a gateway JWT
 *     tags: [GatewayAuth]
 *     parameters:
 *       - { in: path, name: gateway, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signer, signature]
 *             properties:
 *               signer: { type: string, description: Base58 wallet pubkey }
 *               signature:
 *                 type: array
 *                 items: { type: integer }
 *                 description: 64-byte ed25519 signature over the nonce bytes
 *     responses:
 *       200: { description: JWT issued, content: { application/json: { schema: { type: object, properties: { token: { type: string }, expiresIn: { type: integer } } } } } }
 *       401: { description: Verification failed }
 */
router.post("/:gateway/auth/verify", async (req, res, next) => {
  try {
    const gateway = req.params.gateway;
    if (!isValidSolanaPubkey(gateway)) {
      return res.status(400).json({ error: "Invalid gateway pubkey" });
    }
    const { signer, signature } = req.body ?? {};
    if (!isValidSolanaPubkey(signer)) {
      return res.status(400).json({ error: "Invalid signer pubkey" });
    }
    if (!Array.isArray(signature) || signature.length !== 64) {
      return res
        .status(400)
        .json({ error: "signature must be a 64-byte array" });
    }
    // Check challenge exists before doing the RPC fetch.
    if (!getChallenge(gateway)) {
      return res
        .status(401)
        .json({ error: "No active challenge — request one first" });
    }

    const result = await verifyGatewayAuthority({
      gateway,
      signer,
      signature: Uint8Array.from(signature),
    });
    if (!result.ok) {
      return res.status(401).json({ error: result.reason });
    }
    const token = await issueGatewayToken(gateway, signer);
    res.json(token);
  } catch (error) {
    next(error);
  }
});

// ─── Merchant: policies / subscribers / revenue / export ───────────────────

/**
 * @openapi
 * /v1/gateway/{gateway}/merchant/policies:
 *   get:
 *     summary: List policies under a gateway
 *     tags: [GatewayMerchant]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: gateway, required: true, schema: { type: string } }
 *       - { in: query, name: limit,  schema: { type: integer, default: 100 } }
 *       - { in: query, name: offset, schema: { type: integer, default: 0 } }
 *     responses:
 *       200:
 *         description: Paginated policies.
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { items: { type: array, items: { type: object } }, total: { type: integer } } }
 */
router.get(
  "/:gateway/merchant/policies",
  requireGatewayAuth,
  async (req, res, next) => {
    try {
      const gateway = req.params.gateway;
      const result = await listMerchantPolicies(gateway, {
        limit: parseLimit(req.query.limit),
        offset: parseOffset(req.query.offset),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:gateway/merchant/subscribers",
  requireGatewayAuth,
  async (req, res, next) => {
    try {
      const gateway = req.params.gateway;
      const result = await listMerchantSubscribers(gateway, {
        limit: parseLimit(req.query.limit),
        offset: parseOffset(req.query.offset),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:gateway/merchant/revenue",
  requireGatewayAuth,
  async (req, res, next) => {
    try {
      const gateway = req.params.gateway;
      const result = await getMerchantRevenue(gateway, {
        startTime: req.query.startTime
          ? new Date(req.query.startTime as string)
          : undefined,
        endTime: req.query.endTime
          ? new Date(req.query.endTime as string)
          : undefined,
        bucket: req.query.bucket === "week" ? "week" : "day",
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * CSV export — ?format=csv dumps text/csv; JSON is the default for ad-hoc
 * inspection. Each shape reuses the same aggregations as the JSON endpoints.
 */
router.get(
  "/:gateway/merchant/export/:kind",
  requireGatewayAuth,
  async (req, res, next) => {
    try {
      const gateway = req.params.gateway;
      const kind = req.params.kind;
      const wantCsv = req.query.format === "csv";
      const limit = parseLimit(req.query.limit);
      const offset = parseOffset(req.query.offset);

      if (kind === "payments") {
        const rows = await listGatewayPayments(gateway, { limit, offset });
        if (wantCsv) {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="payments-${gateway}.csv"`,
          );
          return res.send(paymentsToCsv(rows));
        }
        return res.json(rows);
      }

      if (kind === "policies") {
        const { items } = await listMerchantPolicies(gateway, {
          limit,
          offset,
        });
        if (wantCsv) {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="policies-${gateway}.csv"`,
          );
          return res.send(policiesToCsv(items));
        }
        return res.json(items);
      }

      if (kind === "subscribers") {
        const { items } = await listMerchantSubscribers(gateway, {
          limit,
          offset,
        });
        if (wantCsv) {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="subscribers-${gateway}.csv"`,
          );
          return res.send(subscribersToCsv(items));
        }
        return res.json(items);
      }

      if (kind === "revenue") {
        const rev = await getMerchantRevenue(gateway);
        if (wantCsv) {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="revenue-${gateway}.csv"`,
          );
          return res.send(revenueToCsv(rev));
        }
        return res.json(rev);
      }

      res.status(404).json({ error: `Unknown export kind: ${kind}` });
    } catch (error) {
      next(error);
    }
  },
);

// ─── CSV serializers ──────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const head = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

function policiesToCsv(items: MerchantPolicy[]): string {
  return rowsToCsv(
    [
      "policyAddress",
      "family",
      "policyId",
      "variant",
      "status",
      "amount",
      "paymentFrequency",
      "recipient",
      "userPayment",
      "createdAt",
      "paymentCount",
      "totalPaid",
      "lastPaymentAt",
    ],
    items as unknown as Array<Record<string, unknown>>,
  );
}

function subscribersToCsv(items: MerchantSubscriber[]): string {
  return rowsToCsv(
    ["wallet", "policyCount", "totalPaid", "lastActiveAt"],
    items as unknown as Array<Record<string, unknown>>,
  );
}

function revenueToCsv(rev: MerchantRevenue): string {
  const summary = rowsToCsv(
    ["mrr", "recognizedRevenue", "activeSubscriptionCount"],
    [
      {
        mrr: rev.mrr,
        recognizedRevenue: rev.recognizedRevenue,
        activeSubscriptionCount: rev.activeSubscriptionCount,
      },
    ],
  );
  const series = rowsToCsv(
    ["ts", "mrr", "recognized"],
    rev.series as unknown as Array<Record<string, unknown>>,
  );
  return `${summary}\n\n${series}`;
}

function paymentsToCsv(rows: any[]): string {
  const flat = rows.map((r) => {
    const d = r.data ?? {};
    return {
      signature: r.signature,
      slot: r.slot,
      timestamp: r.timestamp,
      paymentPolicy: d.payment_policy ?? "",
      gateway: d.gateway ?? "",
      amount: d.amount ?? "",
      payer: d.payer ?? "",
      recipient: d.recipient ?? "",
      recordId: d.record_id ?? "",
    };
  });
  return rowsToCsv(
    [
      "signature",
      "slot",
      "timestamp",
      "paymentPolicy",
      "gateway",
      "amount",
      "payer",
      "recipient",
      "recordId",
    ],
    flat,
  );
}

export default router;
