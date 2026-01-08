# Versioning and Tagging Strategy

This document defines the versioning approach for all packages in the Tributary monorepo, including SDK packages, Solana programs, and the web application.

## Overview

The Tributary monorepo uses **independent versioning** for each package. This approach allows packages to evolve at their own pace based on their specific change cadence and dependency requirements. Each package is versioned and released independently, triggered by changes specific to that package.

### Why Independent Versioning?

1. **Different Release Cadence**: SDK packages may receive frequent updates for developer experience improvements, while Solana programs require more conservative updates due to deployment complexity and user migration costs.

2. **Dependency Flexibility**: `sdk-react` can remain on sdk@1.x while sdk evolves to 2.x, allowing consumers to upgrade incrementally.

3. **Clear Ownership**: Each package's version history reflects its own development timeline, making it easier to understand when features or fixes were introduced.

4. **Reduced Noise**: Changing one package doesn't force version bumps in unrelated packages.

## Package Classification

| Package      | Type             | Published to NPM        | Release Trigger                             | Version Scope                        |
| ------------ | ---------------- | ----------------------- | ------------------------------------------- | ------------------------------------ |
| `sdk/`       | TypeScript SDK   | Yes                     | Conventional commits with `sdk` scope       | Semantic Versioning (1.x, 2.x, etc.) |
| `sdk-react/` | React SDK        | Yes                     | Conventional commits with `sdk-react` scope | Semantic Versioning (1.x, 2.x, etc.) |
| `programs/`  | Solana Contracts | No (GitHub Releases)    | Changes in `programs/` directory            | Semantic Versioning with program ID  |
| `app/`       | Web Application  | No (deployed from main) | Push to main branch                         | Not versioned for release            |

## Git Tag Format

### SDK Packages (sdk/, sdk-react/)

```
# Version release tags
sdk@v1.0.0
sdk-react@v1.0.0

# Channel tags (for pre-release)
sdk@latest
sdk@next
sdk-react@latest
sdk-react@next

# Major version aliases
sdk@v1
sdk-react@v1
```

### Solana Programs

```
# Version release with program ID reference
programs@v1.0.0-TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ

# Simplified version tag
programs@v1.0.0

# Channel tags
programs@latest
programs@next
```

### Tag Creation Workflow

```bash
# SDK release (created by semantic-release)
git tag sdk@v1.2.0
git tag sdk-react@v1.2.0

# Program release (manual or CI)
git tag programs@v0.2.0 -m "Program ID: TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ"

# Push tags
git push origin sdk@v1.2.0 sdk-react@v1.2.0 programs@v0.2.0
```

## Versioning Rules by Package Type

### SDK Packages (sdk/, sdk-react/)

Follows standard Semantic Versioning:

- **Major** (`x.0.0`): Breaking changes to public API

  - Removing or renaming exported functions/classes
  - Changing function signatures
  - Modifying return value structure
  - Removing or changing enum values

- **Minor** (`1.x.0`): New features (backward compatible)

  - Adding new exported functions/classes
  - Adding optional parameters to existing functions
  - Adding new properties to return types
  - New configuration options

- **Patch** (`1.0.x`): Bug fixes and improvements
  - Bug fixes that don't change API
  - Performance improvements
  - Internal refactoring without API changes
  - Documentation updates

### Solana Programs (programs/)

Follows Semantic Versioning with additional considerations:

- **Major** (`x.0.0`): Breaking changes to program instruction interface

  - Changing instruction accounts
  - Modifying instruction data format
  - Removing or renaming instructions
  - Changes requiring program re-deployment

- **Minor** (`1.x.0`): New features and instructions

  - Adding new instructions
  - Adding optional accounts to existing instructions
  - New program configuration options

- **Patch** (`1.0.x`): Bug fixes and optimizations
  - Bug fixes in instruction logic
  - Performance optimizations
  - Security patches
  - CPI interface improvements

### App (web application)

The `app/` package is **not versioned** for npm release. It is:

- Deployed directly from the `main` branch
- Uses continuous deployment with preview deployments for PRs
- Changes are reflected immediately on next deployment
- No version tags or npm publishing

## Release Triggers

### SDK Release Conditions

A release is triggered when commits matching the package scope are merged to main:

| Commit Message Pattern   | Release Type | Applies To             |
| ------------------------ | ------------ | ---------------------- |
| `feat(sdk): ...`         | Minor        | sdk only               |
| `fix(sdk): ...`          | Patch        | sdk only               |
| `feat(sdk-react): ...`   | Minor        | sdk-react only         |
| `fix(sdk-react): ...`    | Patch        | sdk-react only         |
| `BREAKING CHANGE: ...`   | Major        | Any package with scope |
| `! sdk` suffix in footer | Major        | sdk only               |

### Program Release Conditions

A program release is triggered when:

- Files in `programs/` directory are modified
- The Anchor.toml configuration changes
- IDL files are regenerated

```yaml
# .github/workflows/release-programs.yml (example trigger)
on:
  push:
    branches: [main]
    paths:
      - "programs/**"
      - "Anchor.toml"
```

### App Deployment

App is deployed on every push to main:

- Preview deployments for PRs
- Production deployment on merge to main
- No semantic versioning or npm publishing

## NPM Publishing Strategy

### SDK Packages

**Publishing Configuration:**

```json
// sdk/package.json
{
  "name": "@tributary-so/sdk",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}

// sdk-react/package.json
{
  "name": "@tributary-so/sdk-react",
  "peerDependencies": {
    "@tributary-so/sdk": "workspace:*"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}
```

**Publishing Workflow:**

1. Commit with appropriate scope merges to main
2. Semantic-release analyzes commit and determines version bump
3. Version is updated in package.json
4. Git tag created with `package@version` format
5. Package built and published to npm
6. GitHub release created with changelog

**Workspace Protocol:**

sdk-react uses `workspace:*` protocol during development and is configured to accept any sdk version:

```json
// sdk-react/package.json
{
  "dependencies": {
    "@tributary-so/sdk": "workspace:*"
  },
  "peerDependencies": {
    "@tributary-so/sdk": "^1.0.0"
  }
}
```

### Pre-release Channels

SDK packages support pre-release channels for testing:

- `next`: Pre-release of next minor version (e.g., 1.3.0-next.0)
- `beta`: Feature-complete but may have bugs
- `rc`: Release candidate, ready for production

```bash
# Publishing to next channel
npm publish --tag next

# Publishing to beta channel
npm publish --tag beta
```

## Release Flow Examples

### Example 1: SDK Fix

```bash
# Developer commits fix
git commit -m "fix(sdk): resolve connection timeout issue

- Add retry logic for RPC calls
- Increase default timeout to 30s

Closes #123"

# Merge to main
# Semantic-release triggers:
# - Analyzes commit as fix(sdk) → patch release
# - Updates sdk/package.json: 1.2.0 → 1.2.1
# - Creates tag: sdk@v1.2.1
# - Publishes to npm
# - Creates GitHub release
```

### Example 2: Program Update

```bash
# Developer commits program change
git commit -m "feat(programs): add emergency pause instruction

- Add pause authority role
- Allow gateway to pause payments in emergency
- Update IDL for new instruction"

# Merge to main
# CI triggers:
# - Anchor build
# - Semantic-release: 0.1.0 → 0.2.0
# - Creates tag: programs@v0.2.0
# - Uploads .so binary to GitHub release
# - Creates release notes
```

### Example 3: SDK Breaking Change

```bash
# Developer commits breaking change
git commit -m "feat(sdk): refactor payment flow API

- Rename `createPayment` to `createPaymentTransaction`
- Change return type from Payment to PaymentTransaction
- Require explicit commitment level parameter

BREAKING CHANGE: Payment interface updated. See migration guide."

# Merge to main
# Semantic-release triggers:
# - Detects BREAKING CHANGE footer
# - Major release: 1.2.0 → 2.0.0
# - Creates tag: sdk@v2.0.0
# - Publishes major version
# - Creates GitHub release with migration guide
```

## Commit Message Conventions

The project uses Conventional Commits with package-specific scopes.

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "sdk",
        "sdk-react",
        "programs",
        "app",
        "landing",
        "scheduler",
        "cli",
        "x402",
        "tests",
        "docs",
        "ci",
      ],
    ],
  },
};
```

### Valid Commit Messages

```bash
# SDK changes
feat(sdk): add new payment method handler
fix(sdk): resolve wallet connection race condition
docs(sdk): update API reference documentation

# SDK-React changes
feat(sdk-react): add usePaymentSubscription hook
fix(sdk-react): resolve React 19 compatibility issue

# Program changes
feat(programs): add new instruction for delegations
fix(programs): resolve CPI argument serialization bug

# App changes (not versioned)
feat(app): update landing page design
fix(app): resolve navigation routing issue

# Cross-cutting changes
feat: add new Solana RPC provider integration
chore: update GitHub Actions workflows
docs: update overall project documentation
```

### Breaking Change Commits

```bash
# Standard breaking change
feat(sdk): redesign configuration API

BREAKING CHANGE: Configuration options have changed.
Old: configure({ rpcUrl: "..." })
New: configure({ endpoint: "...", commitment: "..." })

# Alternative: ! convention
feat(sdk)!: redesign configuration API

BREAKING CHANGE: Configuration options have changed.
```

## Version Progression Examples

### SDK Version History

| Version | Date       | Changes                   |
| ------- | ---------- | ------------------------- |
| 1.0.0   | 2024-06-01 | Initial release           |
| 1.1.0   | 2024-07-15 | Added payment gateway API |
| 1.2.0   | 2024-08-20 | Added policy management   |
| 1.2.1   | 2024-09-05 | Bug fixes                 |
| 2.0.0   | 2024-10-01 | Breaking: New async API   |

### SDK-React Version History

| Version | Date       | Changes                         |
| ------- | ---------- | ------------------------------- |
| 1.0.0   | 2024-06-15 | Initial React hooks             |
| 1.1.0   | 2024-07-20 | Added usePaymentGateway         |
| 1.2.0   | 2024-08-25 | Added policy hooks              |
| 1.2.1   | 2024-09-10 | Bug fixes                       |
| 2.0.0   | 2024-10-15 | Breaking: Updated for sdk@2.0.0 |

### Programs Version History

| Version | Date       | Program ID   | Changes                       |
| ------- | ---------- | ------------ | ----------------------------- |
| 0.1.0   | 2024-05-01 | TRibg8...2tJ | Initial program               |
| 0.2.0   | 2024-08-15 | TRibg8...2tJ | Added pause instruction       |
| 0.3.0   | 2024-10-01 | TRibg8...2tJ | Added delegation improvements |

## Integration with CI/CD

### GitHub Actions Workflow Structure

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release-sdk:
    if: contains(join(github.event.commits.*.message), 'sdk')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        working-directory: ./sdk

      - name: Release SDK
        run: npx semantic-release
        working-directory: ./sdk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  release-sdk-react:
    if: contains(join(github.event.commits.*.message), 'sdk-react')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        working-directory: ./sdk-react

      - name: Release SDK-React
        run: npx semantic-release
        working-directory: ./sdk-react
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  release-programs:
    if: contains(join(github.event.commits.*.message), 'programs') || contains(join(github.event.commits.*.message), 'anchor')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Setup Solana
        uses: solana-labs/setup-solana@v1
        with:
          version: stable

      - name: Build program
        run: anchor build
        working-directory: ./programs/tributary

      - name: Release Program
        run: npx semantic-release
        working-directory: ./programs/tributary
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        working-directory: ./app

      - name: Build app
        run: pnpm build
        working-directory: ./app

      - name: Deploy to Vercel
        # Vercel deployment configuration
```

### Semantic Release Configuration

```json
// sdk/.releaserc
{
  "branches": ["main"],
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits",
        "releaseRules": [
          { "type": "feat", "scope": "sdk", "release": "minor" },
          { "type": "fix", "scope": "sdk", "release": "patch" },
          { "type": "BREAKING CHANGE", "release": "major" },
          { "breaking": true, "release": "major" }
        ]
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits",
        "writerOpts": {
          "headerPartial": "# @tributary-so/sdk Changelog\n\n"
        }
      }
    ],
    "@semantic-release/github",
    [
      "@semantic-release/npm",
      {
        "pkgRoot": "sdk"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["sdk/package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

## Version Communication

### SDK Consumers

When sdk or sdk-react releases a new version:

1. **GitHub Release**: Created with changelog
2. **NPM Update**: Available for `npm install @tributary-so/sdk`
3. **Breaking Changes**: Documented in release notes with migration guide

### Program Users

When programs release:

1. **GitHub Release**: Created with binary (.so) and IDL files
2. **Program ID**: Documented in release notes
3. **Upgrade Path**: Described for existing integrations

### App Updates

App is continuously deployed. No version communication needed beyond standard deployment notifications.

## Summary

| Aspect                   | Decision                                         |
| ------------------------ | ------------------------------------------------ |
| **Versioning Model**     | Independent per package                          |
| **SDK Versioning**       | Semantic Versioning (1.x, 2.x, etc.)             |
| **Program Versioning**   | Semantic Versioning with program ID              |
| **App Versioning**       | Not versioned (deployed from main)               |
| **Tag Format**           | `package@vx.y.z` (e.g., `sdk@v1.2.0`)            |
| **Release Tool**         | semantic-release for SDK, manual/CI for programs |
| **Pre-release Channels** | next, beta, rc for SDK packages                  |
| **Commit Scopes**        | Package-specific (sdk, sdk-react, programs, app) |
| **Breaking Changes**     | Major version with BREAKING CHANGE footer        |
