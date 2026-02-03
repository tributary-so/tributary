module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@tributary-so/sdk|@solana/web3.js|@solana/spl-token))",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
  ],
  moduleNameMapper: {
    "^@tributary-so/sdk$": "<rootDir>/src/__tests__/mocks/tributary-sdk.js",
    "^@solana/web3.js$": "<rootDir>/src/__tests__/mocks/solana-web3.js",
    "^@solana/spl-token$": "<rootDir>/src/__tests__/mocks/solana-spl-token.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};
