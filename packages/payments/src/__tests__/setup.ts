// Jest setup file for @tributary-so/payments tests

// Mock dependencies to avoid ES module issues
const mockTributary = {
  getUserPaymentPda: jest
    .fn()
    .mockReturnValue({ address: "mockUserPaymentPda" }),
  getPaymentPoliciesByUserPayment: jest.fn().mockResolvedValue([]),
  getPaymentPoliciesByGateway: jest.fn().mockResolvedValue([]),
  getPaymentPolicy: jest.fn(),
};

const mockConnection = {
  getAccountInfo: jest.fn(),
  getParsedTransaction: jest.fn(),
  getSignaturesForAddress: jest.fn(),
};

const mockPublicKey = jest.fn().mockImplementation((key) => ({
  toBase58: () => key || "mockPublicKey",
  toString: () => key || "mockPublicKey",
  equals: jest.fn(),
}));

jest.mock("@tributary-so/sdk", () => ({
  Tributary: jest.fn().mockImplementation(() => mockTributary),
  // Stub for `encodeMemo(id, len)` — returns a fixed-length buffer so
  // tracking.ts can call bs58.encode() on it without exploding. Tests
  // that need to assert the encoded shape can override this per-test.
  encodeMemo: jest.fn(() => Buffer.alloc(64, 0xab)),
  // Stub for `decodeMemo(buf)` — returns a fixed string so the
  // ComposablePolicyTracker normalization path doesn't explode. Per-test
  // overrides can assert the decoded shape.
  decodeMemo: jest.fn(() => "decoded-memo"),
  PaymentPolicy: {},
  ComposablePolicy: {},
}));

jest.mock("@solana/web3.js", () => ({
  Connection: jest.fn().mockImplementation(() => mockConnection),
  PublicKey: mockPublicKey,
}));

jest.mock("@solana/spl-token", () => ({
  // Mock SPL token functions
  getMint: jest.fn(),
  getAccount: jest.fn(),
  createAssociatedTokenAccountInstruction: jest.fn(),
  createTransferInstruction: jest.fn(),
}));

// Global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
});
