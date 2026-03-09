import { eq, and, desc } from "drizzle-orm";
import { getDb } from ".";
import { webhooks, type Webhook, type NewWebhook } from "./schema";

export async function insertWebhook(
  webhook: NewWebhook
): Promise<Webhook | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const [result] = await db.insert(webhooks).values(webhook).returning();
  return result;
}

export async function getWebhooksByGateway(
  gatewayPubkey: string,
  options?: { activeOnly?: boolean }
): Promise<Webhook[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(webhooks.gatewayPubkey, gatewayPubkey)];

  if (options?.activeOnly) {
    conditions.push(eq(webhooks.active, true));
  }

  return db
    .select()
    .from(webhooks)
    .where(and(...conditions))
    .orderBy(desc(webhooks.createdAt));
}

export async function getAllWebhooks(options?: {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Webhook[]> {
  const db = getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (options?.activeOnly) {
    conditions.push(eq(webhooks.active, true));
  }

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  if (conditions.length > 0) {
    return db
      .select()
      .from(webhooks)
      .where(and(...conditions))
      .orderBy(desc(webhooks.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(webhooks)
    .orderBy(desc(webhooks.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getWebhookById(id: number): Promise<Webhook | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .limit(1);

  return webhook;
}

export async function updateWebhookActive(
  id: number,
  active: boolean
): Promise<Webhook | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const [result] = await db
    .update(webhooks)
    .set({ active })
    .where(eq(webhooks.id, id))
    .returning();

  return result;
}

export async function deleteWebhook(id: number): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .delete(webhooks)
    .where(eq(webhooks.id, id))
    .returning();

  return result.length > 0;
}

export async function deleteWebhooksByGateway(
  gatewayPubkey: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .delete(webhooks)
    .where(eq(webhooks.gatewayPubkey, gatewayPubkey))
    .returning();

  return result.length > 0;
}
