import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  transform: {
    "^.+\\.(ts|js)$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
    "!src/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: [
    // ponytail: pnpm nests packages under .pnpm/<pkg>@<ver>/node_modules/<pkg>.
    // The optional prefix lets both flat and nested layouts resolve jose
    // (ESM-only) so ts-jest can transform it.
    "node_modules/(?!(?:.pnpm/[^/]+/node_modules/)?(@tributary-so/payments|@tributary-so/sdk|jose))",
  ],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};

export default config;
