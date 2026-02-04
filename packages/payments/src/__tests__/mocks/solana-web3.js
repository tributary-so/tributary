// Mock for @solana/web3.js
module.exports = {
  Connection: jest.fn().mockImplementation(() => ({
    getAccountInfo: jest.fn(),
    getParsedTransaction: jest.fn(),
    getSignaturesForAddress: jest.fn(),
  })),
  PublicKey: jest.fn().mockImplementation((key) => ({
    toBase58: () => key || "mockPublicKey",
    toString: () => key || "mockPublicKey",
    equals: jest.fn(),
  })),
};
