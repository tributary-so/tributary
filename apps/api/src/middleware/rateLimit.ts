import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60 * 1000);

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyFn?: (req: Request) => string;
}) {
  const { windowMs, maxRequests, keyFn } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn
      ? keyFn(req)
      : req.ip ?? (req.headers["x-forwarded-for"] as string) ?? "unknown";

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        timestamp: Date.now(),
      });
      return;
    }

    entry.count++;
    next();
  };
}

export function walletRateLimit(options: {
  windowMs: number;
  maxRequests: number;
  bodyKey?: string;
}) {
  const { windowMs, maxRequests, bodyKey = "walletPublicKey" } = options;

  return rateLimit({
    windowMs,
    maxRequests,
    keyFn: (req: Request) => {
      const wallet = (req.body as any)?.[bodyKey];
      const ip = req.ip ?? req.headers["x-forwarded-for"] ?? "unknown";
      return wallet ? `wallet:${wallet}` : `ip:${ip}`;
    },
  });
}
