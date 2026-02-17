/**
 * Request Logger Middleware
 * Logs incoming requests with timing information
 */

import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  req.startTime = startTime;

  const { method, path, ip } = req;
  const userAgent = req.get("user-agent") || "unknown";

  console.log(`[${new Date().toISOString()}] ${method} ${path} - ${ip} - ${userAgent}`);

  res.on("finish", () => {
    const duration = Date.now() - (req.startTime || startTime);
    const { statusCode } = res;

    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - ${statusCode} - ${duration}ms`
    );
  });

  next();
}
