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
} from "../db/queries";

const router: ExpressRouter = Router();

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

router.get("/names", async (req, res, next) => {
  try {
    const names = await getUniqueEventNames();
    res.json(names);
  } catch (error) {
    next(error);
  }
});

router.get("/names/tributary", async (req, res, next) => {
  try {
    const names = await getTributaryEventNames();
    res.json(names);
  } catch (error) {
    next(error);
  }
});

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
