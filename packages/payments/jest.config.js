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
  moduleNameMapper: {
    "^@tributary-so/sdk$": "<rootDir>/src/__tests__/mocks/tributary-sdk.js",
    "^@solana/web3.js$": "<rootDir>/src/__tests__/mocks/solana-web3.js",
    "^@solana/spl-token$": "<rootDir>/src/__tests__/mocks/solana-spl-token.js",
    "^jose$": "<rootDir>/src/__tests__/mocks/jose.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};
