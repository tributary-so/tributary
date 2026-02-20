import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from ".";
import { events, type Event } from "./schema";

export async function getEventsBySignature(
  signature: string
): Promise<Event | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.signature, signature))
    .limit(1);
  return event;
}

export async function getEventsBySlot(
  slot: number,
  options?: { limit?: number; offset?: number }
): Promise<Event[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(events)
    .where(eq(events.slot, slot))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);
}

export async function getEventsByName(
  eventName: string,
  options?: { limit?: number; offset?: number }
): Promise<Event[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(events)
    .where(eq(events.eventName, eventName))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);
}

export async function getEventsByTimeRange(
  startTime: Date,
  endTime: Date,
  options?: { limit?: number; offset?: number }
): Promise<Event[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(events)
    .where(
      and(gte(events.timestamp, startTime), lte(events.timestamp, endTime))
    )
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);
}

export async function searchEvents(
  filters?: {
    eventName?: string;
    startTime?: Date;
    endTime?: Date;
    minSlot?: number;
    maxSlot?: number;
  },
  options?: { limit?: number; offset?: number }
): Promise<Event[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.eventName) {
    conditions.push(eq(events.eventName, filters.eventName));
  }
  if (filters?.startTime) {
    conditions.push(gte(events.timestamp, filters.startTime));
  }
  if (filters?.endTime) {
    conditions.push(lte(events.timestamp, filters.endTime));
  }
  if (filters?.minSlot) {
    conditions.push(gte(events.slot, filters.minSlot));
  }
  if (filters?.maxSlot) {
    conditions.push(lte(events.slot, filters.maxSlot));
  }

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  if (conditions.length > 0) {
    return db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(events)
    .orderBy(desc(events.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getEventCount(filters?: {
  eventName?: string;
  startTime?: Date;
  endTime?: Date;
}): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const conditions = [];

  if (filters?.eventName) {
    conditions.push(eq(events.eventName, filters.eventName));
  }
  if (filters?.startTime) {
    conditions.push(gte(events.timestamp, filters.startTime));
  }
  if (filters?.endTime) {
    conditions.push(lte(events.timestamp, filters.endTime));
  }

  if (conditions.length > 0) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(and(...conditions));
    return result?.count ?? 0;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events);
  return result?.count ?? 0;
}

export async function getUniqueEventNames(): Promise<string[]> {
  const db = getDb();
  if (!db) return [];

  const results = await db
    .selectDistinct({ eventName: events.eventName })
    .from(events)
    .orderBy(events.eventName);

  return results.map((r) => r.eventName);
}
