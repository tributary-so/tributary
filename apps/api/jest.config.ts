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
    // ponytail: resolve the tokens-client workspace package to its TypeScript
    // source so ts-jest can transform the ESM `export` syntax to CJS for jest.
    // Without this, jest loads the prebuilt dist/*.js (ESM) and chokes.
    "^@tributary-so/tokens-client$":
      "<rootDir>/../../packages/tokens-client/src/index.ts",
    "^@tributary-so/tokens-client/react$":
      "<rootDir>/../../packages/tokens-client/src/react.ts",
    "^@tributary-so/tokens-client/devnetFallback$":
      "<rootDir>/../../packages/tokens-client/src/devnetFallback.ts",
  },
  transformIgnorePatterns: [
    // ponytail: pnpm nests packages under .pnpm/<pkg>@<ver>/node_modules/<pkg>.
    // The optional prefix lets both flat and nested layouts resolve jose
    // (ESM-only) so ts-jest can transform it.
    "node_modules/(?!(?:.pnpm/[^/]+/node_modules/)?(@tributary-so/payments|@tributary-so/sdk|@tributary-so/tokens-client|jose))",
  ],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};

export default config;
