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
