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
