/**
 * Merchant aggregations — derived off-chain from the events table.
 *
 * Status derivation per policy (ADR-0026):
 *   PaymentPolicyCreated  → status := Active
 *   each StatusChanged    → status := new_status (Active|Paused)
 *   PolicyDeleted         → status := Deleted (terminal)
 *
 * Same shape for ComposablePolicy* events (independent counter, ADR-0007).
 *
 * Ponytail: aggregates per request from the events table. Documented ceiling
 * (ADR-0026): revisit materialization if a gateway exceeds ~1k active
 * policies.
 */

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from ".";
import { events } from "./schema";

// Program + seeds — frozen per ADR-0022 (no realloc / no seed changes).
const PROGRAM_ID = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

const SEED_PAYMENT_POLICY = "payment_policy";
const SEED_COMPOSABLE_POLICY = "composable_policy";

function derivePolicyPda(userPayment: string, policyId: number): string {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED_PAYMENT_POLICY),
      new PublicKey(userPayment).toBuffer(),
      new BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    PROGRAM_ID
  );
  return address.toString();
}

function deriveComposablePda(userPayment: string, policyId: number): string {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED_COMPOSABLE_POLICY),
      new PublicKey(userPayment).toBuffer(),
      new BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    PROGRAM_ID
  );
  return address.toString();
}

export type PolicyFamily = "regular" | "composable";
export type DerivedStatus = "Active" | "Paused" | "Deleted";

export interface MerchantPolicy {
  policyAddress: string;
  family: PolicyFamily;
  policyId: number;
  recipient: string;
  userPayment: string;
  variant: string; // "Subscription" | "Milestone" | "PayAsYouGo" | "OneTime" | "UpTo"
  status: DerivedStatus;
  amount: string | null; // variant-specific; subscription/oneTime/upTo only
  paymentFrequency: string | null;
  createdAt: number; // unix seconds
  paymentCount: number;
  totalPaid: string;
  lastPaymentAt: number | null;
}

export interface MerchantSubscriber {
  wallet: string;
  policyCount: number;
  totalPaid: string;
  lastActiveAt: number | null;
}

export interface MerchantRevenue {
  mrr: string;
  recognizedRevenue: string;
  activeSubscriptionCount: number;
  series: Array<{ ts: string; mrr: string; recognized: string }>;
}

const FREQUENCY_TO_MONTHS: Record<string, number> = {
  Daily: 1 / 30,
  Weekly: 1 / 4,
  Biweekly: 1 / 2,
  Monthly: 1,
  Quarterly: 3,
  SemiAnnually: 6,
  Annually: 12,
};

interface PolicyEventRow {
  user_payment: string;
  gateway: string;
  recipient: string;
  policy_id: number;
  policy_type: any;
}

interface PaymentRow {
  payment_policy: string;
  payer?: string;
  amount: number;
}

interface StatusRow {
  payment_policy: string;
  new_status: any;
}

interface DeletedRow {
  payment_policy?: string;
  composable_policy?: string;
}

/**
 * Fetch all policy-shaped events for a gateway in one pass, then group in JS.
 * One query per event-name family keeps the SQL trivial; the grouping is O(n).
 */
async function fetchGatewayPolicyState(gateway: string) {
  const db = getDb();
  if (!db) {
    return {
      created: [] as any[],
      composableCreated: [] as any[],
      deleted: [] as any[],
      composableDeleted: [] as any[],
      statusChanged: [] as any[],
      composableStatusChanged: [] as any[],
      payments: [] as any[],
    };
  }

  const gatewayFilter = sql`${events.data}->>'gateway' = ${gateway}`;

  const [
    created,
    composableCreated,
    deleted,
    composableDeleted,
    statusChanged,
    composableStatusChanged,
    payments,
  ] = await Promise.all([
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.eventName, "tributary_PaymentPolicyCreated"),
          gatewayFilter
        )
      )
      .orderBy(desc(events.timestamp)),
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.eventName, "tributary_ComposablePolicyCreated"),
          gatewayFilter
        )
      )
      .orderBy(desc(events.timestamp)),
    db
      .select()
      .from(events)
      .where(and(eq(events.eventName, "tributary_PaymentPolicyDeleted"))),
    db
      .select()
      .from(events)
      .where(and(eq(events.eventName, "tributary_ComposablePolicyDeleted"))),
    db
      .select()
      .from(events)
      .where(eq(events.eventName, "tributary_PaymentPolicyStatusChanged")),
    db
      .select()
      .from(events)
      .where(
        and(eq(events.eventName, "tributary_ComposablePolicyStatusChanged"))
      ),
    db
      .select()
      .from(events)
      .where(
        and(eq(events.eventName, "tributary_PaymentRecord"), gatewayFilter)
      )
      .orderBy(desc(events.timestamp)),
  ]);

  return {
    created,
    composableCreated,
    deleted,
    composableDeleted,
    statusChanged,
    composableStatusChanged,
    payments,
  };
}

function variantName(policyType: any): string {
  if (!policyType || typeof policyType !== "object") return "Unknown";
  return Object.keys(policyType)[0] ?? "Unknown";
}

function variantAmount(policyType: any): string | null {
  if (!policyType || typeof policyType !== "object") return null;
  const v = Object.keys(policyType)[0];
  const inner = policyType[v];
  if (v === "Subscription" && inner?.amount != null)
    return String(inner.amount);
  if (v === "OneTime" && inner?.amount != null) return String(inner.amount);
  if (v === "UpTo" && inner?.max_amount != null)
    return String(inner.max_amount);
  return null;
}

function variantFrequency(policyType: any): string | null {
  if (!policyType || typeof policyType !== "object") return null;
  const sub = policyType.Subscription;
  if (!sub || !sub.payment_frequency) return null;
  if (typeof sub.payment_frequency === "object") {
    const key = Object.keys(sub.payment_frequency)[0];
    return key ?? null;
  }
  return String(sub.payment_frequency);
}

function parseStatus(s: any): DerivedStatus {
  if (s === "Active" || s === "Paused") return s;
  if (typeof s === "object" && s !== null) {
    if ("Active" in s) return "Active";
    if ("Paused" in s) return "Paused";
  }
  return "Active";
}

function asUnixSeconds(ts: Date | string | number): number {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Math.floor(d.getTime() / 1000);
}

export async function listMerchantPolicies(
  gateway: string,
  options?: { limit?: number; offset?: number }
): Promise<{ items: MerchantPolicy[]; total: number }> {
  const state = await fetchGatewayPolicyState(gateway);

  const deletedSet = new Set<string>(
    state.deleted
      .map((r) => (r.data as DeletedRow).payment_policy)
      .filter((v): v is string => !!v)
  );
  const composableDeletedSet = new Set<string>(
    state.composableDeleted
      .map((r) => (r.data as DeletedRow).composable_policy)
      .filter((v): v is string => !!v)
  );

  // status map keyed by policy address (most recent wins, events ordered desc)
  const statusMap = new Map<string, DerivedStatus>();
  for (const r of state.statusChanged) {
    const d = r.data as StatusRow;
    if (d.payment_policy && !statusMap.has(d.payment_policy)) {
      statusMap.set(d.payment_policy, parseStatus(d.new_status));
    }
  }
  for (const r of state.composableStatusChanged) {
    const d = r.data as any;
    const key = d.composable_policy;
    if (key && !statusMap.has(key)) {
      statusMap.set(key, parseStatus(d.new_status));
    }
  }

  // payment aggregation keyed by policy address
  const paymentStats = new Map<
    string,
    { count: number; total: bigint; lastAt: number | null }
  >();
  for (const r of state.payments) {
    const d = r.data as PaymentRow;
    if (!d.payment_policy) continue;
    const cur = paymentStats.get(d.payment_policy) ?? {
      count: 0,
      total: 0n,
      lastAt: null,
    };
    cur.count += 1;
    cur.total += BigInt(d.amount ?? 0);
    const ts = asUnixSeconds(r.timestamp);
    if (cur.lastAt === null || ts > cur.lastAt) cur.lastAt = ts;
    paymentStats.set(d.payment_policy, cur);
  }

  const items: MerchantPolicy[] = [];

  for (const r of state.created) {
    const d = r.data as PolicyEventRow;
    const policyAddress = derivePolicyPda(d.user_payment, d.policy_id);
    const deleted = deletedSet.has(policyAddress);
    const status: DerivedStatus = deleted
      ? "Deleted"
      : statusMap.get(policyAddress) ?? "Active";
    const stats = paymentStats.get(policyAddress);
    items.push({
      policyAddress,
      family: "regular",
      policyId: d.policy_id,
      recipient: d.recipient,
      userPayment: d.user_payment,
      variant: variantName(d.policy_type),
      status,
      amount: variantAmount(d.policy_type),
      paymentFrequency: variantFrequency(d.policy_type),
      createdAt: asUnixSeconds(r.timestamp),
      paymentCount: stats?.count ?? 0,
      totalPaid: (stats?.total ?? 0n).toString(),
      lastPaymentAt: stats?.lastAt ?? null,
    });
  }

  for (const r of state.composableCreated) {
    const d = r.data as any;
    const policyAddress = deriveComposablePda(d.user_payment, d.policy_id);
    const deleted = composableDeletedSet.has(policyAddress);
    const status: DerivedStatus = deleted
      ? "Deleted"
      : statusMap.get(policyAddress) ?? "Active";
    const stats = paymentStats.get(policyAddress);
    items.push({
      policyAddress,
      family: "composable",
      policyId: d.policy_id,
      recipient: d.recipient,
      userPayment: d.user_payment,
      variant: variantName(d.policy_type),
      status,
      amount: variantAmount(d.policy_type),
      paymentFrequency: variantFrequency(d.policy_type),
      createdAt: asUnixSeconds(r.timestamp),
      paymentCount: stats?.count ?? 0,
      totalPaid: (stats?.total ?? 0n).toString(),
      lastPaymentAt: stats?.lastAt ?? null,
    });
  }

  // newest first
  items.sort((a, b) => b.createdAt - a.createdAt);

  const total = items.length;
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  return { items: items.slice(offset, offset + limit), total };
}

export async function listMerchantSubscribers(
  gateway: string,
  options?: { limit?: number; offset?: number }
): Promise<{ items: MerchantSubscriber[]; total: number }> {
  const state = await fetchGatewayPolicyState(gateway);

  // subscriber = distinct payer from PaymentRecord events under this gateway.
  // (PaymentPolicyCreated doesn't carry the payer — only owner via user_payment
  // PDA, which is the delegate, not necessarily the human payer. The
  // PaymentRecord's `payer` field is the right identity signal.)
  const stats = new Map<
    string,
    { total: bigint; lastAt: number | null; policies: Set<string> }
  >();

  for (const r of state.payments) {
    const d = r.data as PaymentRow;
    const payer = d.payer;
    if (!payer) continue;
    const cur = stats.get(payer) ?? {
      total: 0n,
      lastAt: null,
      policies: new Set<string>(),
    };
    cur.total += BigInt(d.amount ?? 0);
    const ts = asUnixSeconds(r.timestamp);
    if (cur.lastAt === null || ts > cur.lastAt) cur.lastAt = ts;
    if (d.payment_policy) cur.policies.add(d.payment_policy);
    stats.set(payer, cur);
  }

  const items: MerchantSubscriber[] = Array.from(stats.entries()).map(
    ([wallet, s]) => ({
      wallet,
      policyCount: s.policies.size,
      totalPaid: s.total.toString(),
      lastActiveAt: s.lastAt,
    })
  );

  items.sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0));

  const total = items.length;
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  return { items: items.slice(offset, offset + limit), total };
}

export async function getMerchantRevenue(
  gateway: string,
  options?: { startTime?: Date; endTime?: Date; bucket?: "day" | "week" }
): Promise<MerchantRevenue> {
  const state = await fetchGatewayPolicyState(gateway);

  // MRR = Σ Subscription.amount normalized to monthly over Active (non-deleted,
  // non-paused) policies. PayAsYouGo/Milestone/OneTime/UpTo excluded.
  const deletedSet = new Set<string>(
    state.deleted
      .map((r) => (r.data as DeletedRow).payment_policy)
      .filter((v): v is string => !!v)
  );
  const composableDeletedSet = new Set<string>(
    state.composableDeleted
      .map((r) => (r.data as DeletedRow).composable_policy)
      .filter((v): v is string => !!v)
  );
  const statusMap = new Map<string, DerivedStatus>();
  for (const r of state.statusChanged) {
    const d = r.data as StatusRow;
    if (d.payment_policy && !statusMap.has(d.payment_policy)) {
      statusMap.set(d.payment_policy, parseStatus(d.new_status));
    }
  }
  for (const r of state.composableStatusChanged) {
    const d = r.data as any;
    if (d.composable_policy && !statusMap.has(d.composable_policy)) {
      statusMap.set(d.composable_policy, parseStatus(d.new_status));
    }
  }

  let mrr = 0;
  let activeSubCount = 0;
  for (const r of state.created) {
    const d = r.data as PolicyEventRow;
    const addr = derivePolicyPda(d.user_payment, d.policy_id);
    if (deletedSet.has(addr)) continue;
    if ((statusMap.get(addr) ?? "Active") !== "Active") continue;
    const pt = d.policy_type;
    if (!pt || typeof pt !== "object") continue;
    const sub = pt.Subscription;
    if (!sub) continue;
    const freqKey = variantFrequency(pt);
    const months = freqKey ? FREQUENCY_TO_MONTHS[freqKey] ?? 1 : 1;
    mrr += Number(sub.amount ?? 0) / months;
    activeSubCount += 1;
  }
  // Composables contribute the same way (Subscription variant only).
  for (const r of state.composableCreated) {
    const d = r.data as any;
    const addr = deriveComposablePda(d.user_payment, d.policy_id);
    if (composableDeletedSet.has(addr)) continue;
    if ((statusMap.get(addr) ?? "Active") !== "Active") continue;
    const pt = d.policy_type;
    if (!pt || typeof pt !== "object") continue;
    const sub = pt.Subscription;
    if (!sub) continue;
    const freqKey = variantFrequency(pt);
    const months = freqKey ? FREQUENCY_TO_MONTHS[freqKey] ?? 1 : 1;
    mrr += Number(sub.amount ?? 0) / months;
    activeSubCount += 1;
  }

  // Recognized revenue = Σ PaymentRecord.amount in window (all variants).
  const startSec = options?.startTime
    ? Math.floor(options.startTime.getTime() / 1000)
    : 0;
  const endSec = options?.endTime
    ? Math.floor(options.endTime.getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  let recognized = 0n;
  for (const r of state.payments) {
    const d = r.data as PaymentRow;
    const ts = asUnixSeconds(r.timestamp);
    if (ts < startSec || ts > endSec) continue;
    recognized += BigInt(d.amount ?? 0);
  }

  // Series — bucket recognized by day (or week). MRR is a snapshot, so each
  // bucket's `mrr` is the current MRR (constant across the series). This is
  // honest: the on-chain event stream can't reconstruct historical MRR
  // without replaying status changes per-bucket, which is a v2 concern.
  const bucket = options?.bucket ?? "day";
  const buckets = bucketize(
    state.payments,
    bucket,
    startSec ||
      asUnixSeconds(
        state.payments[state.payments.length - 1]?.timestamp ?? new Date()
      ),
    endSec
  );

  return {
    mrr: String(Math.round(mrr)),
    recognizedRevenue: recognized.toString(),
    activeSubscriptionCount: activeSubCount,
    series: buckets.map((b) => ({
      ts: b.ts,
      mrr: String(Math.round(mrr)),
      recognized: b.total.toString(),
    })),
  };
}

interface Bucket {
  ts: string; // ISO date (YYYY-MM-DD)
  total: bigint;
}

function bucketize(
  payments: any[],
  bucket: "day" | "week",
  startSec: number,
  endSec: number
): Bucket[] {
  if (payments.length === 0) return [];
  const dayMs = bucket === "day" ? 86_400_000 : 7 * 86_400_000;
  const startDay = Math.floor((startSec * 1000) / dayMs) * dayMs;
  const endMs = endSec * 1000;
  const out: Bucket[] = [];
  for (let t = startDay; t <= endMs; t += dayMs) {
    out.push({ ts: new Date(t).toISOString().slice(0, 10), total: 0n });
  }
  const idx = new Map(out.map((b, i) => [b.ts, i]));
  for (const r of payments) {
    const d = r.data as PaymentRow;
    const ts = asUnixSeconds(r.timestamp) * 1000;
    const key = new Date(Math.floor(ts / dayMs) * dayMs)
      .toISOString()
      .slice(0, 10);
    const i = idx.get(key);
    if (i !== undefined) out[i].total += BigInt(d.amount ?? 0);
  }
  return out;
}

/**
 * Payments export — reuses the existing events/payments shape but returns
 * raw rows for CSV serialization. The route handler does the CSV stringify.
 */
export async function listGatewayPayments(
  gateway: string,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.eventName, "tributary_PaymentRecord"),
        sql`${events.data}->>'gateway' = ${gateway}`
      )
    )
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 1000)
    .offset(options?.offset ?? 0);
}
