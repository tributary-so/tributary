import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  // ponytail: scheduler source uses ESM-style `.js` import specifiers
  // (moduleResolution: bundler). Jest's resolver needs the extension
  // stripped so it can find the underlying .ts file.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.(ts|js)$": [
      "ts-jest",
      {
        tsconfig: {
          // ponytail: transpile-only. Source has pre-existing type errors in
          // logger.ts (Anchor/win­ston shape drift) that block type-check but
          // don't affect runtime. Drop this to re-enable diagnostics.
          isolatedModules: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          // ponytail: scheduler's tsconfig sets `types: []` which strips jest
          // globals. Re-add them here so describe/it/expect type-check.
          types: ["jest", "node"],
        },
      },
    ],
  },
};

export default config;
