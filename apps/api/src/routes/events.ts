import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import {
  getEventsBySignature,
  getEventsBySlot,
  getEventsByName,
  getEventsByTimeRange,
  searchEvents,
  getEventCount,
  getUniqueEventNames,
  getTributaryEventNames,
  getTypedEvents,
  getPaymentRecords,
  getPaymentPolicyCreatedEvents,
  getGatewayFeeBpsChangedEvents,
  getGatewayFeeRecipientChangedEvents,
  getGatewaySignerChangedEvents,
  getPaymentGatewayCreatedEvents,
  getPaymentGatewayDeletedEvents,
  getPaymentPolicyDeletedEvents,
  getPaymentPolicyStatusChangedEvents,
  getProgramConfigCreatedEvents,
  getReferralRewardDistributedEvents,
  getUserPaymentCreatedEvents,
  getPaymentStats,
  getEventsByMemo,
} from "../db/queries";
import { encodeMemo } from "@tributary-so/sdk";

const router: ExpressRouter = Router();

/**
 * @openapi
 * /v1/events:
 *   get:
 *     summary: Query on-chain events
 *     description: >
 *       Polymorphic event lookup. Exactly one filter mode is applied per
 *       request, evaluated in this priority order: `signature` → `slot` →
 *       `trackingId` → `eventName` → `startTime`/`endTime`. If none match,
 *       a generic `searchEvents` is run.
 *     tags: [Events]
 *     operationId: queryEvents
 *     parameters:
 *       - in: query
 *         name: signature
 *         schema: { type: string }
 *         description: Transaction signature (returns a single event or 404).
 *       - in: query
 *         name: slot
 *         schema: { type: integer }
 *         description: Solana slot number.
 *       - in: query
 *         name: eventName
 *         schema: { type: string }
 *         description: Event name filter.
 *       - in: query
 *         name: trackingId
 *         schema: { type: string }
 *         description: Encoded memo tracking ID (matched via 64-byte memo encoding).
 *       - in: query
 *         name: startTime
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endTime
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: minSlot
 *         schema: { type: integer }
 *       - in: query
 *         name: maxSlot
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Event record(s).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Single event (when `signature` is supplied).
 *                 - type: array
 *                   items: { type: object }
 *                   description: Event list.
 *       404:
 *         description: Event not found (signature lookup).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      signature,
      slot,
      eventName,
      startTime,
      endTime,
      minSlot,
      maxSlot,
      trackingId,
      limit = "100",
      offset = "0",
    } = req.query;

    if (signature) {
      const event = await getEventsBySignature(signature as string);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.json(event);
    }

    if (slot) {
      const events = await getEventsBySlot(Number(slot), {
        limit: Number(limit),
        offset: Number(offset),
      });
      return res.json(events);
    }

    if (trackingId) {
      const encodedMemo = encodeMemo(trackingId as string, 64);
      const events = await getEventsByMemo(encodedMemo, {
        limit: Number(limit),
        offset: Number(offset),
      });
      return res.json(events);
    }

    if (eventName) {
      const events = await getEventsByName(eventName as string, {
        limit: Number(limit),
        offset: Number(offset),
      });
      return res.json(events);
    }

    if (startTime || endTime) {
      const events = await getEventsByTimeRange(
        startTime ? new Date(startTime as string) : new Date(0),
        endTime ? new Date(endTime as string) : new Date(),
        {
          limit: Number(limit),
          offset: Number(offset),
        }
      );
      return res.json(events);
    }

    const events = await searchEvents(
      {
        eventName: eventName as string | undefined,
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        minSlot: minSlot ? Number(minSlot) : undefined,
        maxSlot: maxSlot ? Number(maxSlot) : undefined,
      },
      {
        limit: Number(limit),
        offset: Number(offset),
      }
    );

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/count:
 *   get:
 *     summary: Count events
 *     description: Returns a count of events optionally filtered by name and/or time range.
 *     tags: [Events]
 *     operationId: countEvents
 *     parameters:
 *       - in: query
 *         name: eventName
 *         schema: { type: string }
 *       - in: query
 *         name: startTime
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endTime
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Event count.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [count]
 *               properties:
 *                 count: { type: integer, example: 42 }
 */
router.get("/count", async (req, res, next) => {
  try {
    const { eventName, startTime, endTime } = req.query;

    const count = await getEventCount({
      eventName: eventName as string | undefined,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/names:
 *   get:
 *     summary: All known event names
 *     description: Returns the distinct set of event names indexed in the database.
 *     tags: [Events]
 *     operationId: getEventNames
 *     responses:
 *       200:
 *         description: Distinct event names.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: string }
 */
router.get("/names", async (_req, res, next) => {
  try {
    const names = await getUniqueEventNames();
    res.json(names);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/names/tributary:
 *   get:
 *     summary: Tributary event names
 *     description: Returns the canonical set of event names emitted by the Tributary program.
 *     tags: [Events]
 *     operationId: getTributaryEventNames
 *     responses:
 *       200:
 *         description: Tributary event names.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: string }
 */
router.get("/names/tributary", async (_req, res, next) => {
  try {
    const names = await getTributaryEventNames();
    res.json(names);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/payments:
 *   get:
 *     summary: Payment records
 *     description: Returns `PaymentRecord` events optionally filtered by gateway and/or policy.
 *     tags: [Events]
 *     operationId: getPaymentEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: paymentPolicy
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Payment record events.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: object }
 */
router.get("/payments", async (req, res, next) => {
  try {
    const { gateway, paymentPolicy, limit, offset } = req.query;

    const events = await getPaymentRecords({
      gateway: gateway as string | undefined,
      paymentPolicy: paymentPolicy as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/payments/stats:
 *   get:
 *     summary: Payment statistics
 *     description: Aggregated payment statistics (count, volume) optionally filtered by gateway and/or time range.
 *     tags: [Events]
 *     operationId: getPaymentStats
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: startTime
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endTime
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Payment statistics.
 *         content:
 *           application/json:
 *             schema: { type: object }
 */
router.get("/payments/stats", async (req, res, next) => {
  try {
    const { gateway, startTime, endTime } = req.query;

    const stats = await getPaymentStats({
      gateway: gateway as string | undefined,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/policies/created:
 *   get:
 *     summary: PolicyCreated events
 *     description: Returns `PaymentPolicyCreated` events.
 *     tags: [Events]
 *     operationId: getPolicyCreatedEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: recipient
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: userPayment
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Policy-created event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/policies/created", async (req, res, next) => {
  try {
    const { gateway, recipient, userPayment, limit, offset } = req.query;

    const events = await getPaymentPolicyCreatedEvents({
      gateway: gateway as string | undefined,
      recipient: recipient as string | undefined,
      userPayment: userPayment as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/policies/deleted:
 *   get:
 *     summary: PolicyDeleted events
 *     tags: [Events]
 *     operationId: getPolicyDeletedEvents
 *     parameters:
 *       - in: query
 *         name: paymentPolicy
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: owner
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Policy-deleted event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/policies/deleted", async (req, res, next) => {
  try {
    const { paymentPolicy, owner, limit, offset } = req.query;

    const events = await getPaymentPolicyDeletedEvents({
      paymentPolicy: paymentPolicy as string | undefined,
      owner: owner as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/policies/status-changed:
 *   get:
 *     summary: PolicyStatusChanged events
 *     tags: [Events]
 *     operationId: getPolicyStatusChangedEvents
 *     parameters:
 *       - in: query
 *         name: paymentPolicy
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Policy status-change event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/policies/status-changed", async (req, res, next) => {
  try {
    const { paymentPolicy, limit, offset } = req.query;

    const events = await getPaymentPolicyStatusChangedEvents({
      paymentPolicy: paymentPolicy as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/gateways/created:
 *   get:
 *     summary: GatewayCreated events
 *     tags: [Events]
 *     operationId: getGatewayCreatedEvents
 *     parameters:
 *       - in: query
 *         name: authority
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Gateway-created event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/gateways/created", async (req, res, next) => {
  try {
    const { authority, limit, offset } = req.query;

    const events = await getPaymentGatewayCreatedEvents({
      authority: authority as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/gateways/deleted:
 *   get:
 *     summary: GatewayDeleted events
 *     tags: [Events]
 *     operationId: getGatewayDeletedEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: authority
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Gateway-deleted event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/gateways/deleted", async (req, res, next) => {
  try {
    const { gateway, authority, limit, offset } = req.query;

    const events = await getPaymentGatewayDeletedEvents({
      gateway: gateway as string | undefined,
      authority: authority as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/gateways/fee-bps-changed:
 *   get:
 *     summary: GatewayFeeBpsChanged events
 *     tags: [Events]
 *     operationId: getGatewayFeeBpsChangedEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Fee-bps-change event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/gateways/fee-bps-changed", async (req, res, next) => {
  try {
    const { gateway, limit, offset } = req.query;

    const events = await getGatewayFeeBpsChangedEvents({
      gateway: gateway as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/gateways/fee-recipient-changed:
 *   get:
 *     summary: GatewayFeeRecipientChanged events
 *     tags: [Events]
 *     operationId: getGatewayFeeRecipientChangedEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Fee-recipient-change event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/gateways/fee-recipient-changed", async (req, res, next) => {
  try {
    const { gateway, limit, offset } = req.query;

    const events = await getGatewayFeeRecipientChangedEvents({
      gateway: gateway as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/gateways/signer-changed:
 *   get:
 *     summary: GatewaySignerChanged events
 *     tags: [Events]
 *     operationId: getGatewaySignerChangedEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Signer-change event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/gateways/signer-changed", async (req, res, next) => {
  try {
    const { gateway, limit, offset } = req.query;

    const events = await getGatewaySignerChangedEvents({
      gateway: gateway as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/referrals/rewards:
 *   get:
 *     summary: ReferralRewardDistributed events
 *     tags: [Events]
 *     operationId: getReferralRewardEvents
 *     parameters:
 *       - in: query
 *         name: gateway
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: paymentPolicy
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Referral-reward event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/referrals/rewards", async (req, res, next) => {
  try {
    const { gateway, paymentPolicy, limit, offset } = req.query;

    const events = await getReferralRewardDistributedEvents({
      gateway: gateway as string | undefined,
      paymentPolicy: paymentPolicy as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/user-payments/created:
 *   get:
 *     summary: UserPaymentCreated events
 *     tags: [Events]
 *     operationId: getUserPaymentCreatedEvents
 *     parameters:
 *       - in: query
 *         name: owner
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - in: query
 *         name: tokenMint
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: User-payment-created event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/user-payments/created", async (req, res, next) => {
  try {
    const { owner, tokenMint, limit, offset } = req.query;

    const events = await getUserPaymentCreatedEvents({
      owner: owner as string | undefined,
      tokenMint: tokenMint as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/program/config-created:
 *   get:
 *     summary: ProgramConfigCreated events
 *     tags: [Events]
 *     operationId: getProgramConfigCreatedEvents
 *     parameters:
 *       - in: query
 *         name: admin
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Program-config-created event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/program/config-created", async (req, res, next) => {
  try {
    const { admin, limit, offset } = req.query;

    const events = await getProgramConfigCreatedEvents({
      admin: admin as string | undefined,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /v1/events/typed/{eventName}:
 *   get:
 *     summary: Typed event lookup
 *     description: Returns strongly-typed events for the given Tributary event name.
 *     tags: [Events]
 *     operationId: getTypedEvents
 *     parameters:
 *       - in: path
 *         name: eventName
 *         required: true
 *         schema: { type: string }
 *         description: Tributary event name (see `/v1/events/names/tributary`).
 *       - {in: query, name: limit,  schema: {type: integer, minimum: 1, default: 100}}
 *       - {in: query, name: offset, schema: {type: integer, minimum: 0, default: 0}}
 *     responses:
 *       200:
 *         description: Typed event list.
 *         content:
 *           application/json:
 *             schema: { type: array, items: { type: object } }
 */
router.get("/typed/:eventName", async (req, res, next) => {
  try {
    const { eventName } = req.params;
    const { limit, offset } = req.query;

    const events = await getTypedEvents(eventName as any, {
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
