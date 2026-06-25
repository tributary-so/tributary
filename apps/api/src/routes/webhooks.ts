import { Router, Request, Response } from "express";
import type { Express } from "express";
import {
  insertWebhook,
  getAllWebhooks,
  getWebhooksByGateway,
  getWebhookById,
  updateWebhookActive,
  deleteWebhook,
  deleteWebhooksByGateway,
} from "../db/webhooks";

const router: Router = Router();

interface CreateWebhookBody {
  gateway_pubkey: string;
  endpoint_url: string;
  active?: boolean;
}

interface UpdateWebhookBody {
  active: boolean;
}

/**
 * @openapi
 * /v1/webhooks:
 *   post:
 *     summary: Register a webhook
 *     description: Creates a new webhook subscription for a gateway.
 *     tags: [Webhooks]
 *     operationId: createWebhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gateway_pubkey, endpoint_url]
 *             properties:
 *               gateway_pubkey:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 44
 *                 description: Gateway authority public key.
 *               endpoint_url:
 *                 type: string
 *                 format: uri
 *                 description: HTTPS (or HTTP) URL Tributary will POST events to.
 *               active:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the webhook is active immediately.
 *     responses:
 *       201:
 *         description: Webhook created.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Webhook' }
 *       400:
 *         description: Missing fields or invalid URL.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      gateway_pubkey,
      endpoint_url,
      active = true,
    }: CreateWebhookBody = req.body;

    if (!gateway_pubkey || !endpoint_url) {
      return res.status(400).json({
        error: "Missing required fields: gateway_pubkey and endpoint_url",
      });
    }

    if (!isValidUrl(endpoint_url)) {
      return res.status(400).json({
        error: "Invalid endpoint_url format",
      });
    }

    const webhook = await insertWebhook({
      gatewayPubkey: gateway_pubkey,
      endpointUrl: endpoint_url,
      active,
    });

    if (!webhook) {
      return res.status(500).json({ error: "Failed to create webhook" });
    }

    res.status(201).json(webhook);
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /v1/webhooks:
 *   get:
 *     summary: List webhooks
 *     description: Returns all webhooks, optionally filtered to active only and paginated.
 *     tags: [Webhooks]
 *     operationId: listWebhooks
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema: { type: boolean, default: false }
 *         description: When `true`, return only active webhooks.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Webhook list.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Webhook' }
 *       500:
 *         description: Internal error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { active_only, limit, offset } = req.query;

    const webhooks = await getAllWebhooks({
      activeOnly: active_only === "true",
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(webhooks);
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /v1/webhooks/gateway/{gatewayPubkey}:
 *   get:
 *     summary: List webhooks for a gateway
 *     description: Returns all webhooks registered for the given gateway.
 *     tags: [Webhooks]
 *     operationId: listWebhooksByGateway
 *     parameters:
 *       - in: path
 *         name: gatewayPubkey
 *         required: true
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: active_only
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Webhook list for the gateway.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Webhook' }
 *       500:
 *         description: Internal error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/gateway/:gatewayPubkey", async (req: Request, res: Response) => {
  try {
    const { gatewayPubkey } = req.params;
    const { active_only } = req.query;

    const webhooks = await getWebhooksByGateway(gatewayPubkey, {
      activeOnly: active_only === "true",
    });

    res.json(webhooks);
  } catch (error) {
    console.error("Error fetching webhooks for gateway:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /v1/webhooks/{id}:
 *   get:
 *     summary: Get a webhook by ID
 *     tags: [Webhooks]
 *     operationId: getWebhook
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Webhook record.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Webhook' }
 *       400:
 *         description: Invalid ID.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Toggle a webhook's active flag
 *     tags: [Webhooks]
 *     operationId: updateWebhook
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated webhook.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Webhook' }
 *       400:
 *         description: Invalid ID or body.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     operationId: deleteWebhook
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       204: { description: Deleted. }
 *       400:
 *         description: Invalid ID.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = parseInt(id, 10);

    if (isNaN(webhookId)) {
      return res.status(400).json({ error: "Invalid webhook ID" });
    }

    const webhook = await getWebhookById(webhookId);

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json(webhook);
  } catch (error) {
    console.error("Error fetching webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = parseInt(id, 10);
    const { active }: UpdateWebhookBody = req.body;

    if (isNaN(webhookId)) {
      return res.status(400).json({ error: "Invalid webhook ID" });
    }

    if (typeof active !== "boolean") {
      return res
        .status(400)
        .json({ error: "Missing or invalid 'active' field" });
    }

    const webhook = await updateWebhookActive(webhookId, active);

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json(webhook);
  } catch (error) {
    console.error("Error updating webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = parseInt(id, 10);

    if (isNaN(webhookId)) {
      return res.status(400).json({ error: "Invalid webhook ID" });
    }

    const deleted = await deleteWebhook(webhookId);

    if (!deleted) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @openapi
 * /v1/webhooks/gateway/{gatewayPubkey}:
 *   delete:
 *     summary: Delete all webhooks for a gateway
 *     tags: [Webhooks]
 *     operationId: deleteWebhooksByGateway
 *     parameters:
 *       - in: path
 *         name: gatewayPubkey
 *         required: true
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *     responses:
 *       204: { description: Deleted. }
 *       404:
 *         description: No webhooks found for gateway.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete(
  "/gateway/:gatewayPubkey",
  async (req: Request, res: Response) => {
    try {
      const { gatewayPubkey } = req.params;

      const deleted = await deleteWebhooksByGateway(gatewayPubkey);

      if (!deleted) {
        return res.status(404).json({ error: "No webhooks found for gateway" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting webhooks for gateway:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default router;
