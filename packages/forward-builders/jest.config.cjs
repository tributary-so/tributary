/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  // @tributary-so/sdk ships ESM-only; map it to TypeScript source so ts-jest
  // compiles it for the node CommonJS test environment. Without this, runtime
  // imports (e.g. composablePolicyRecipe) hit `import` syntax the CJS loader
  // can't parse.
  moduleNameMapper: {
    "^@tributary-so/sdk$": "<rootDir>/../sdk/src/index.ts",
  },
};
