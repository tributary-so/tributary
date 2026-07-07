/**
 * Error Handler Middleware
 * Centralized error handling for API routes
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("API Error:", err);

  if (err instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
      timestamp: Date.now(),
    };

    if (err.details) {
      (response as any).details = err.details;
    }

    res.status(err.statusCode).json(response);
  } else {
    const response: ApiResponse = {
      success: false,
      error: "Internal server error",
      timestamp: Date.now(),
    };

    res.status(500).json(response);
  }
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: Date.now(),
  };

  res.status(404).json(response);
}

/**
 * Async route wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
