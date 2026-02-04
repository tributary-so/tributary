// Mock for @solana/spl-token
module.exports = {
  getMint: jest.fn(),
  getAccount: jest.fn(),
  createAssociatedTokenAccountInstruction: jest.fn(),
  createTransferInstruction: jest.fn(),
};
