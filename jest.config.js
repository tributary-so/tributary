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
        // ponytail: document-registry crash in TS (isDocumentRegistryEntry
        // reads .sourceFile off undefined) when ts-jest's full-Program compile
        // pulls packages/sdk source via the `paths` mapping. SDK files resolve
        // to packages/sdk/tsconfig.json (moduleResolution: "bundler") whose
        // impliedNodeFormat differs from jest.tsconfig.json's bucket key, so
        // releaseDocumentWithKey dereferences undefined on program release.
        // isolatedModules skips Program creation entirely — no cross-file
        // resolution, no registry churn. Upgrade path: drop the `paths`
        // mapping and import the built SDK dist instead, then full
        // type-checking can come back.
        isolatedModules: true,
      },
    ],
  },
};
