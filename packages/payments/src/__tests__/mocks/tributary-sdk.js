// Mock for @tributary-so/sdk
module.exports = {
  Tributary: jest.fn().mockImplementation(() => ({
    getUserPaymentPda: jest
      .fn()
      .mockReturnValue({ address: "mockUserPaymentPda" }),
    getPaymentPoliciesByUserPayment: jest
      .fn()
      .mockResolvedValue([
        { publicKey: "mockPolicyKey", account: { paymentCount: 1, memo: [] } },
      ]),
    getPaymentPoliciesByGateway: jest
      .fn()
      .mockResolvedValue([
        { publicKey: "mockPolicyKey", account: { paymentCount: 1, memo: [] } },
      ]),
    getPaymentPolicy: jest.fn(),
  })),
};
