module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts"],
  moduleNameMapper: {
    "^@tributary-so/sdk$": "<rootDir>/node_modules/@tributary-so/sdk",
    "^@solana/web3.js$": "<rootDir>/node_modules/@solana/web3.js",
    "^@solana/spl-token$": "<rootDir>/node_modules/@solana/spl-token",
  },
};
