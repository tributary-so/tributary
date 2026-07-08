import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.useFakeTimers();

import { rateLimit, walletRateLimit } from "../middleware/rateLimit";

function mockReq(overrides = {}): any {
  return { ip: "1.2.3.4", body: {}, headers: {}, ...overrides };
}

function mockRes(): any {
  const res: any = { statusCode: 200, body: null };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((data) => {
    res.body = data;
    return res;
  });
  return res;
}

describe("rateLimit", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllTimers();
    req = mockReq({ ip: `ip-${Math.random()}` });
    res = mockRes();
    next = jest.fn();
  });

  it("should allow first request", () => {
    const middleware = rateLimit({ windowMs: 60000, maxRequests: 5 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should allow requests within limit", () => {
    const middleware = rateLimit({ windowMs: 60000, maxRequests: 3 });
    for (let i = 0; i < 3; i++) {
      middleware(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("should return 429 when limit exceeded", () => {
    const middleware = rateLimit({ windowMs: 60000, maxRequests: 2 });
    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body.error).toBe("Too many requests");
    expect(res.body.retryAfter).toBeDefined();
  });

  it("should reset counter after window expires", () => {
    const middleware = rateLimit({ windowMs: 1000, maxRequests: 1 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1001);

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("should use custom keyFn when provided", () => {
    const customKey = jest.fn() as unknown as jest.MockedFunction<
      (req: any) => string
    >;
    customKey.mockReturnValue("custom-key");
    const middleware = rateLimit({
      windowMs: 60000,
      maxRequests: 1,
      keyFn: customKey,
    });
    middleware(req, res, next);
    expect(customKey).toHaveBeenCalledWith(req);
  });

  it("should isolate different keys", () => {
    const middleware = rateLimit({ windowMs: 60000, maxRequests: 1 });
    const req1 = mockReq({ ip: "1.1.1.1" });
    const req2 = mockReq({ ip: "2.2.2.2" });

    middleware(req1, res, next);
    middleware(req2, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe("walletRateLimit", () => {
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    res = mockRes();
    next = jest.fn();
  });

  it("should use wallet key from body", () => {
    const middleware = walletRateLimit({ windowMs: 60000, maxRequests: 1 });
    const req = mockReq({ body: { walletPublicKey: "abc123" } });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should fallback to ip key when no wallet", () => {
    const middleware = walletRateLimit({ windowMs: 60000, maxRequests: 1 });
    const req = mockReq({ body: {} });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should rate limit per wallet not per ip", () => {
    const middleware = walletRateLimit({ windowMs: 60000, maxRequests: 1 });
    const req1 = mockReq({
      ip: "1.1.1.1",
      body: { walletPublicKey: "wallet-A" },
    });
    const req2 = mockReq({
      ip: "2.2.2.2",
      body: { walletPublicKey: "wallet-B" },
    });

    middleware(req1, res, next);
    middleware(req2, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it("should block same wallet from different ips", () => {
    const middleware = walletRateLimit({ windowMs: 60000, maxRequests: 1 });
    const req1 = mockReq({
      ip: "1.1.1.1",
      body: { walletPublicKey: "same-wallet" },
    });
    const req2 = mockReq({
      ip: "2.2.2.2",
      body: { walletPublicKey: "same-wallet" },
    });

    middleware(req1, res, next);
    middleware(req2, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
