import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from ".";
import { events, type Event } from "./schema";
import type {
  TributaryEventName,
  TributaryEventDataMap,
  TributaryPaymentRecord,
  TributaryPaymentPolicyCreated,
  TributaryGatewayFeeBpsChanged,
  TributaryGatewayFeeRecipientChanged,
  TributaryGatewaySignerChanged,
  TributaryPaymentGatewayCreated,
  TributaryPaymentGatewayDeleted,
  TributaryPaymentPolicyDeleted,
  TributaryPaymentPolicyStatusChanged,
  TributaryProgramConfigCreated,
  TributaryReferralRewardDistributedRecord,
  TributaryUserPaymentCreated,
} from "./events";

export interface TypedEvent<T> extends Omit<Event, "data"> {
  data: T;
}

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

export async function getTributaryEventNames(): Promise<TributaryEventName[]> {
  const db = getDb();
  if (!db) return [];

  const results = await db
    .selectDistinct({ eventName: events.eventName })
    .from(events)
    .where(sql`${events.eventName} LIKE 'tributary_%'`)
    .orderBy(events.eventName);

  return results.map((r) => r.eventName as TributaryEventName);
}

export async function getTypedEvents<T extends TributaryEventName>(
  eventName: T,
  options?: { limit?: number; offset?: number }
): Promise<TypedEvent<TributaryEventDataMap[T]>[]> {
  const db = getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(events)
    .where(eq(events.eventName, eventName))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryEventDataMap[T],
  }));
}

export async function getPaymentRecords(options?: {
  gateway?: string;
  paymentPolicy?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryPaymentRecord>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_PaymentRecord")];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }
  if (options?.paymentPolicy) {
    conditions.push(
      sql`${events.data}->>'payment_policy' = ${options.paymentPolicy}`
    );
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentRecord,
  }));
}

// ponytail: brief names `getComposableExecutionsByPolicyAddress`; the sibling
// db/queries.ts bean (milestone `tributary-cbvp`) may reconcile/dedupe this.
// Mirrors getPaymentRecords against the ComposableExecuted event. Returns
// `Event[]` (no strong composable event type exists in events.ts yet — the
// events-centralization sibling adds `TributaryComposableExecuted`).
export async function getComposableExecutionsByPolicyAddress(
  composablePolicy: string,
  options?: { limit?: number; offset?: number }
): Promise<Event[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [
    eq(events.eventName, "tributary_ComposableExecuted"),
    sql`${events.data}->>'composable_policy' = ${composablePolicy}`,
  ];

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);
}

export async function getPaymentPolicyCreatedEvents(options?: {
  gateway?: string;
  recipient?: string;
  userPayment?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryPaymentPolicyCreated>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_PaymentPolicyCreated")];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }
  if (options?.recipient) {
    conditions.push(sql`${events.data}->>'recipient' = ${options.recipient}`);
  }
  if (options?.userPayment) {
    conditions.push(
      sql`${events.data}->>'user_payment' = ${options.userPayment}`
    );
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentPolicyCreated,
  }));
}

export async function getGatewayFeeBpsChangedEvents(options?: {
  gateway?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryGatewayFeeBpsChanged>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_GatewayFeeBpsChanged")];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryGatewayFeeBpsChanged,
  }));
}

export async function getGatewayFeeRecipientChangedEvents(options?: {
  gateway?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryGatewayFeeRecipientChanged>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [
    eq(events.eventName, "tributary_GatewayFeeRecipientChanged"),
  ];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryGatewayFeeRecipientChanged,
  }));
}

export async function getGatewaySignerChangedEvents(options?: {
  gateway?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryGatewaySignerChanged>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_GatewaySignerChanged")];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryGatewaySignerChanged,
  }));
}

export async function getPaymentGatewayCreatedEvents(options?: {
  authority?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryPaymentGatewayCreated>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_PaymentGatewayCreated")];

  if (options?.authority) {
    conditions.push(sql`${events.data}->>'authority' = ${options.authority}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentGatewayCreated,
  }));
}

export async function getPaymentGatewayDeletedEvents(options?: {
  gateway?: string;
  authority?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryPaymentGatewayDeleted>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_PaymentGatewayDeleted")];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }
  if (options?.authority) {
    conditions.push(sql`${events.data}->>'authority' = ${options.authority}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentGatewayDeleted,
  }));
}

export async function getPaymentPolicyDeletedEvents(options?: {
  paymentPolicy?: string;
  owner?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryPaymentPolicyDeleted>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_PaymentPolicyDeleted")];

  if (options?.paymentPolicy) {
    conditions.push(
      sql`${events.data}->>'payment_policy' = ${options.paymentPolicy}`
    );
  }
  if (options?.owner) {
    conditions.push(sql`${events.data}->>'owner' = ${options.owner}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentPolicyDeleted,
  }));
}

export async function getPaymentPolicyStatusChangedEvents(options?: {
  paymentPolicy?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryPaymentPolicyStatusChanged>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [
    eq(events.eventName, "tributary_PaymentPolicyStatusChanged"),
  ];

  if (options?.paymentPolicy) {
    conditions.push(
      sql`${events.data}->>'payment_policy' = ${options.paymentPolicy}`
    );
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentPolicyStatusChanged,
  }));
}

export async function getProgramConfigCreatedEvents(options?: {
  admin?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryProgramConfigCreated>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_ProgramConfigCreated")];

  if (options?.admin) {
    conditions.push(sql`${events.data}->>'admin' = ${options.admin}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryProgramConfigCreated,
  }));
}

export async function getReferralRewardDistributedEvents(options?: {
  gateway?: string;
  paymentPolicy?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryReferralRewardDistributedRecord>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [
    eq(events.eventName, "tributary_ReferralRewardDistributedRecord"),
  ];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }
  if (options?.paymentPolicy) {
    conditions.push(
      sql`${events.data}->>'payment_policy' = ${options.paymentPolicy}`
    );
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryReferralRewardDistributedRecord,
  }));
}

export async function getUserPaymentCreatedEvents(options?: {
  owner?: string;
  tokenMint?: string;
  limit?: number;
  offset?: number;
}): Promise<TypedEvent<TributaryUserPaymentCreated>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_UserPaymentCreated")];

  if (options?.owner) {
    conditions.push(sql`${events.data}->>'owner' = ${options.owner}`);
  }
  if (options?.tokenMint) {
    conditions.push(sql`${events.data}->>'token_mint' = ${options.tokenMint}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryUserPaymentCreated,
  }));
}

export async function getPaymentStats(options?: {
  gateway?: string;
  startTime?: Date;
  endTime?: Date;
}): Promise<{ count: number }> {
  const db = getDb();
  if (!db) return { count: 0 };

  const conditions = [eq(events.eventName, "tributary_PaymentRecord")];

  if (options?.gateway) {
    conditions.push(sql`${events.data}->>'gateway' = ${options.gateway}`);
  }
  if (options?.startTime) {
    conditions.push(gte(events.timestamp, options.startTime));
  }
  if (options?.endTime) {
    conditions.push(lte(events.timestamp, options.endTime));
  }

  const [result] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(events)
    .where(and(...conditions));

  return {
    count: result?.count ?? 0,
  };
}

export async function getOneTimePaymentByTrackingId(
  trackingId: string,
  options?: {
    recipient?: string;
    limit?: number;
    offset?: number;
  }
): Promise<TypedEvent<TributaryPaymentRecord>[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(events.eventName, "tributary_PaymentRecord")];

  conditions.push(
    sql`${events.data}->'memo'::text LIKE ${`%"${trackingId}"%`}`
  );

  if (options?.recipient) {
    conditions.push(sql`${events.data}->>'recipient' = ${options.recipient}`);
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);

  return results.map((event) => ({
    ...event,
    data: event.data as TributaryPaymentRecord,
  }));
}

export async function getEventsByMemo(
  encodedMemo: number[],
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<Event[]> {
  const db = getDb();
  if (!db) return [];

  const memoJson = JSON.stringify(encodedMemo);

  return db
    .select()
    .from(events)
    .where(sql`${events.data}->>'memo' = ${memoJson}`)
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);
}
