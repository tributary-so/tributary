import { getWebhooksByGateway } from "../db/webhooks";
import type { TributaryPaymentRecord } from "../db/events";

interface WebhookPayload {
  event: "tributary_PaymentRecord";
  data: TributaryPaymentRecord;
  timestamp: string;
}

export class WebhookService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly TIMEOUT_MS = 10000;

  static async forwardPaymentRecord(
    gatewayPubkey: string,
    paymentRecord: TributaryPaymentRecord
  ): Promise<void> {
    const webhooks = await getWebhooksByGateway(gatewayPubkey, {
      activeOnly: true,
    });

    if (webhooks.length === 0) {
      console.log(
        `No active webhooks registered for gateway: ${gatewayPubkey}`
      );
      return;
    }

    console.log(
      `Forwarding payment record to ${webhooks.length} webhook(s) for gateway: ${gatewayPubkey}`
    );

    const payload: WebhookPayload = {
      event: "tributary_PaymentRecord",
      data: paymentRecord,
      timestamp: new Date().toISOString(),
    };

    await Promise.allSettled(
      webhooks.map((webhook) =>
        this.sendWebhookWithRetry(webhook.endpointUrl, payload)
      )
    );
  }

  private static async sendWebhookWithRetry(
    url: string,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    try {
      await this.sendWebhook(url, payload);
      console.log(`Successfully sent webhook to ${url}`);
    } catch (error) {
      console.error(
        `Failed to send webhook to ${url} (attempt ${attempt}/${this.MAX_RETRIES}):`,
        error
      );

      if (attempt < this.MAX_RETRIES) {
        await this.sleep(this.RETRY_DELAY_MS * attempt);
        return this.sendWebhookWithRetry(url, payload, attempt + 1);
      }

      console.error(`Max retries exceeded for webhook: ${url}. Giving up.`);
    }
  }

  private static async sendWebhook(
    url: string,
    payload: WebhookPayload
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Tributary-Webhook-Forwarder/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Webhook returned ${response.status}: ${response.statusText} - ${errorText}`
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
