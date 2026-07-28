/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // ponytail: scheduler src uses .js extensions on relative imports
  // (ESM/bundler convention). ts-jest's node resolver needs the bare path.
  // Scoped to relative imports — workspace (@tributary-so/*) and
  // node_modules are untouched.
  moduleNameMapper: {
    "^(\\.{1,2}/.+)\\.js$": "$1",
  },
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
  moduleNameMapper: {
    // Redirect workspace packages to their TypeScript source so ts-jest
    // transforms them.
    //
    // Why only here, not in every test? Most test files import SDK source
    // via relative paths (../packages/sdk/src) — ts-jest transforms those
    // directly. But production code in apps/ (e.g. the scheduler evaluator)
    // imports via package name (@tributary-so/sdk), which Node resolves to
    // packages/sdk/dist (ESM build). Jest's Babel transformer can't parse
    // ESM import statements inside node_modules. This mapper short-circuits
    // the package-name resolution back to the .ts source.
    "^@tributary-so/sdk$": "<rootDir>/packages/sdk/src/index.ts",
    "^@tributary-so/forward-builders$":
      "<rootDir>/packages/forward-builders/src/index.ts",
  },
};
