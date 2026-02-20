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

export default router;
