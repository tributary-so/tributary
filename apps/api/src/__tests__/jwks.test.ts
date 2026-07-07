// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { randomBytes } from "crypto";

jest.mock("jose", () => ({
  exportJWK: jest.fn(),
  importPKCS8: jest.fn(),
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();

jest.mock("../db", () => ({
  getDb: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
}));

jest.mock("../db/schema", () => ({
  signingKeys: {
    kid: "kid",
    privateKey: "privateKey",
    publicJwk: "publicJwk",
    algorithm: "algorithm",
    isCurrent: "isCurrent",
    createdAt: "createdAt",
    expiresAt: "expiresAt",
    rotatedAt: "rotatedAt",
  },
}));

import {
  encryptPrivateKey,
  decryptPrivateKey,
  getCurrentSigningKey,
} from "../services/jwks";

describe("JWKS encryption", () => {
  const ORIGINAL_ENV = process.env.SIGNING_KEY_ENCRYPTION_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SIGNING_KEY_ENCRYPTION_KEY;
  });

  afterAll(() => {
    if (ORIGINAL_ENV) process.env.SIGNING_KEY_ENCRYPTION_KEY = ORIGINAL_ENV;
    else delete process.env.SIGNING_KEY_ENCRYPTION_KEY;
  });

  it("should return plaintext PEM when no encryption key", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
    const result = encryptPrivateKey(pem);
    expect(result).toBe(pem);
  });

  it("should encrypt and decrypt round-trip", () => {
    process.env.SIGNING_KEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");

    const pem =
      "-----BEGIN PRIVATE KEY-----\ntest123\n-----END PRIVATE KEY-----";
    const encrypted = encryptPrivateKey(pem);
    expect(encrypted).not.toBe(pem);
    expect(encrypted).not.toContain("-----BEGIN");

    const decrypted = decryptPrivateKey(encrypted);
    expect(decrypted).toBe(pem);
  });

  it("should detect plaintext PEM and skip decryption", () => {
    process.env.SIGNING_KEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");

    const pem =
      "-----BEGIN PRIVATE KEY-----\nlegacy\n-----END PRIVATE KEY-----";
    const result = decryptPrivateKey(pem);
    expect(result).toBe(pem);
  });

  it("should produce different ciphertext each time", () => {
    process.env.SIGNING_KEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");

    const pem = "-----BEGIN PRIVATE KEY-----\nsame\n-----END PRIVATE KEY-----";
    const a = encryptPrivateKey(pem);
    const b = encryptPrivateKey(pem);
    expect(a).not.toBe(b);
    expect(decryptPrivateKey(a)).toBe(pem);
    expect(decryptPrivateKey(b)).toBe(pem);
  });
});

describe("getCurrentSigningKey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimit });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  it("should return null when no keys exist", async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await getCurrentSigningKey();
    expect(result).toBeNull();
  });

  it("should decrypt private key on retrieval", async () => {
    const encKey = randomBytes(32).toString("hex");
    process.env.SIGNING_KEY_ENCRYPTION_KEY = encKey;

    const pem = "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----";
    const { encryptPrivateKey } = require("../services/jwks");

    mockLimit.mockResolvedValueOnce([
      {
        kid: "test-kid",
        privateKey: encryptPrivateKey(pem),
        publicJwk: { kty: "EC" },
        algorithm: "ES256",
        isCurrent: true,
        createdAt: new Date(),
        expiresAt: null,
        rotatedAt: null,
      },
    ]);

    const result = await getCurrentSigningKey();
    expect(result).not.toBeNull();
    expect(result.privateKey).toBe(pem);

    delete process.env.SIGNING_KEY_ENCRYPTION_KEY;
  });
});
