/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Integration suites run against a Surfpool mainnet-fork, whose RPC is
  // slower than localnet. Give every test a generous default so slower
  // setup/execution paths (milestone chains, referral graphs, …) don't trip
  // jest's 5s default.
  testTimeout: 90000,
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "jest.tsconfig.json",
      },
    ],
  },
};
