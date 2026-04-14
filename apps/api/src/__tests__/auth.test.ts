// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockJwtVerify = jest.fn();
const mockImportJWK = jest.fn();

jest.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
  importJWK: mockImportJWK,
  errors: {
    JWTExpired: class JWTExpired extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "JWTExpired";
      }
    },
  },
}));

jest.mock("../services/jwks", () => ({
  getSigningKeyByKid: jest.fn(),
}));

import { requireAuth, optionalAuth, verifyToken } from "../middleware/auth";
import { getSigningKeyByKid } from "../services/jwks";

const mockGetSigningKeyByKid = getSigningKeyByKid as jest.Mock;

const VALID_KEY = {
  kid: "trib-2025-01-01-a",
  publicJwk: { kty: "EC", crv: "P-256", x: "fake", y: "fake" },
  algorithm: "ES256",
  isCurrent: true,
  createdAt: new Date(),
  expiresAt: null,
  rotatedAt: null,
  privateKey: "",
};

function makeToken(header: any, payload: any) {
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${h}.${p}.fake-sig`;
}

function mockReq(overrides = {}) {
  return { headers: {}, ...overrides };
}

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((data) => {
    res.body = data;
    return res;
  });
  return res;
}

describe("verifyToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject tokens without kid", async () => {
    const token = makeToken({ alg: "ES256" }, {});
    await expect(verifyToken(token)).rejects.toThrow("Missing kid");
  });

  it("should reject unknown signing keys", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(null);
    const token = makeToken({ alg: "ES256", kid: "unknown" }, {});
    await expect(verifyToken(token)).rejects.toThrow("Unknown signing key");
  });

  it("should reject rotated-out signing keys", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce({
      ...VALID_KEY,
      expiresAt: new Date(Date.now() - 1000),
    });
    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, {});
    await expect(verifyToken(token)).rejects.toThrow("rotated out");
  });

  it("should return payload on valid token", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "wallet123",
        iss: "https://api.tributary.so",
        aud: "tributary-checkout",
      },
    });

    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, {});
    const result = await verifyToken(token);
    expect(result.sub).toBe("wallet123");
  });

  it("should allow expired tokens when allowExpired is true", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});

    const { errors } = require("jose");
    mockJwtVerify.mockRejectedValueOnce(new errors.JWTExpired("expired"));

    const payload = {
      sub: "wallet123",
      iss: "https://api.tributary.so",
      aud: "tributary-checkout",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, payload);
    const result = await verifyToken(token, { allowExpired: true });
    expect(result.sub).toBe("wallet123");
  });

  it("should reject expired token with wrong issuer even with allowExpired", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});

    const { errors } = require("jose");
    mockJwtVerify.mockRejectedValueOnce(new errors.JWTExpired("expired"));

    const payload = {
      sub: "wallet123",
      iss: "https://evil.com",
      aud: "tributary-checkout",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, payload);
    await expect(verifyToken(token, { allowExpired: true })).rejects.toThrow(
      "Invalid token issuer"
    );
  });
});

describe("requireAuth", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockReq();
    res = mockRes();
    next = jest.fn();
  });

  it("should return 401 when no Authorization header", async () => {
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 for non-Bearer scheme", async () => {
    req.headers.authorization = "Basic abc123";
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should set jwtPayload and call next on success", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "wallet123",
        iss: "https://api.tributary.so",
        aud: "tributary-checkout",
      },
    });

    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, {});
    req.headers.authorization = `Bearer ${token}`;
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.jwtPayload.sub).toBe("wallet123");
  });

  it("should return 401 on verification failure", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});
    mockJwtVerify.mockRejectedValueOnce(new Error("bad signature"));

    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, {});
    req.headers.authorization = `Bearer ${token}`;
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("optionalAuth", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockReq();
    res = mockRes();
    next = jest.fn();
  });

  it("should return 401 when no Authorization header", async () => {
    await optionalAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow expired tokens", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});

    const { errors } = require("jose");
    mockJwtVerify.mockRejectedValueOnce(new errors.JWTExpired("expired"));

    const payload = {
      sub: "wallet123",
      iss: "https://api.tributary.so",
      aud: "tributary-checkout",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, payload);
    req.headers.authorization = `Bearer ${token}`;
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.jwtPayload.sub).toBe("wallet123");
  });

  it("should reject expired tokens with invalid audience", async () => {
    mockGetSigningKeyByKid.mockResolvedValueOnce(VALID_KEY);
    mockImportJWK.mockResolvedValueOnce({});

    const { errors } = require("jose");
    mockJwtVerify.mockRejectedValueOnce(new errors.JWTExpired("expired"));

    const payload = {
      sub: "wallet123",
      iss: "https://api.tributary.so",
      aud: "wrong-audience",
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const token = makeToken({ alg: "ES256", kid: VALID_KEY.kid }, payload);
    req.headers.authorization = `Bearer ${token}`;
    await optionalAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
