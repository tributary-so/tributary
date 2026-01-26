# Semantic Release for Monorepo Versioning

This document provides a comprehensive guide for implementing semantic-release in a monorepo with multiple packages: `sdk/`, `sdk-react/`, `programs/` (Solana contracts), and `app/` (frontend).

## Overview

Semantic-release automates versioning and package publishing based on Conventional Commits. For monorepos, several approaches exist:

1. **`semantic-release-monorepo`** - Runs semantic-release once per package with independent versioning
2. **`multi-semantic-release`** - Alternative approach for multi-package repositories
3. **Nx Release** - Nx-native versioning with Conventional Commits support
4. **Lerna with semantic-release** - Traditional monorepo toolchain

## Recommended Plugins

### Core Plugins

| Plugin                                      | Purpose                                    | Required              |
| ------------------------------------------- | ------------------------------------------ | --------------------- |
| `@semantic-release/commit-analyzer`         | Analyzes commits to determine release type | Built-in              |
| `@semantic-release/release-notes-generator` | Generates changelog from commits           | Built-in              |
| `@semantic-release/github`                  | Creates GitHub releases                    | Built-in              |
| `@semantic-release/npm`                     | Publishes to npm registry                  | Yes (for JS packages) |
| `@semantic-release/git`                     | Commits version changes                    | Optional              |

### Monorepo-Specific Plugins

| Plugin                                        | Purpose                           | Install                                                              |
| --------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `semantic-release-monorepo`                   | Runs semantic-release per package | `npm install --save-dev semantic-release-monorepo`                   |
| `@rimac-technology/semantic-release-monorepo` | TypeScript-enhanced version       | `npm install --save-dev @rimac-technology/semantic-release-monorepo` |
| `multi-semantic-release`                      | Alternative multi-package release | `npm install --save-dev multi-semantic-release`                      |
| `semantic-release-yarn`                       | Yarn v2+ with monorepo support    | `npm install --save-dev semantic-release-yarn`                       |

## Configuration Examples

### Option 1: semantic-release-monorepo (Recommended)

Install dependencies:

```bash
npm install --save-dev semantic-release @semantic-release/git semantic-release-monorepo
# For Yarn workspaces:
npm install --save-dev semantic-release-yarn
```

**`.releaserc.json`**:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
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

For multiple packages, create separate configuration per package:

**`sdk/.releaserc`**:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    [
      "@semantic-release/npm",
      {
        "pkgRoot": "sdk"
      }
    ]
  ]
}
```

**`sdk-react/.releaserc`**:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    [
      "@semantic-release/npm",
      {
        "pkgRoot": "sdk-react"
      }
    ]
  ]
}
```

### Option 2: multi-semantic-release

**`.releaserc`**:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github"
  ],
  "multiRelease": true
}
```

Run with:

```bash
npx multi-semantic-release
```

### Option 3: Independent Versions with Workspace Protocol

**`package.json`** (root):

```json
{
  "name": "tributary",
  "private": true,
  "workspaces": ["sdk", "sdk-react", "app"],
  "devDependencies": {
    "semantic-release": "^24.0.0"
  }
}
```

**`sdk/package.json`**:

```json
{
  "name": "@tributary-so/sdk",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public"
  }
}
```

**`sdk-react/package.json`**:

```json
{
  "name": "@tributary-so/sdk-react",
  "version": "1.0.0",
  "peerDependencies": {
    "@tributary-so/sdk": "^1.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## Tagging Strategy

### Recommended Tag Format

For monorepos with multiple packages, use package-scoped tags:

```
# Package-specific tags
sdk@v1.0.0
sdk-react@v1.0.0
programs@v1.0.0

# Channel tags
sdk@latest
sdk@next
sdk-react@latest
sdk-react@next

# Major version tags
sdk@v1
sdk-react@v1
```

### GitHub Actions Configuration

**.github/workflows/release.yml**:

```yaml
name: Release

on:
  push:
    branches:
      - main
      - release/*

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: npm clean-install

      - name: Release SDK
        if: contains(join(github.event.commits.*.message), 'sdk') || contains(join(github.event.commits.*.message), 'feat') || contains(join(github.event.commits.*.message), 'fix')
        working-directory: ./sdk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release

      - name: Release SDK-React
        if: contains(join(github.event.commits.*.message), 'sdk-react') || contains(join(github.event.commits.*.message), 'feat') || contains(join(github.event.commits.*.message), 'fix')
        working-directory: ./sdk-react
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

### Alternative: Single Release Workflow

**.github/workflows/release.yml** (single job):

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: npm clean-install

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release-monorepo
```

## Conventional Commits with Monorepo Scopes

Configure commit scopes for each package:

**`commitlint.config.js`**:

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["sdk", "sdk-react", "programs", "app", "ci", "docs"],
    ],
  },
};
```

**Example commits**:

```
feat(sdk): add new payment function
fix(sdk-react): resolve React hooks dependency
feat(programs): add new Solana instruction
docs: update API documentation
```

### Separate Changelogs Per Package

**`sdk/.releaserc`**:

```json
{
  "branches": ["main"],
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits",
        "releaseRules": [
          { "type": "feat", "release": "minor" },
          { "type": "fix", "release": "patch" },
          { "type": "perf", "release": "patch" },
          { "scope": "sdk", "release": "patch" }
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
    ]
  ]
}
```

## Solana Program Release Considerations

Solana programs (in `programs/`) require special handling since they don't use npm:

### Option 1: GitHub Releases Only

**`programs/.releaserc`**:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits"
      }
    ],
    [
      "@semantic-release/github",
      {
        "assets": [
          {
            "path": "target/deploy/*.so",
            "label": "Solana program binary"
          }
        ]
      }
    ]
  ]
}
```

### Option 2: Anchor Release Workflow

**.github/workflows/release-programs.yml**:

```yaml
name: Release Programs

on:
  push:
    branches:
      - main
    paths:
      - programs/**

jobs:
  release:
    name: Release Program
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
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
        working-directory: ./programs
        run: |
          anchor build
          cp target/idl/*.idl target/deploy/*.so ../

      - name: Release
        env:
          GITHUB_TOKEN: $UB_TOKEN }}
       {{ secrets.GITH run: npx semantic-release
```

## Trusted Publishing and NPM Security

For improved security, use [trusted publishing](https://docs.npmjs.com/trusted-publishers) via OIDC:

### Step 1: Configure NPM Trusted Publisher

1. Go to [npmjs.com](https://www.npmjs.com/settings/YOUR_ORG/publishers)
2. Add a trusted publisher for your GitHub repository
3. Specify the workflow file path

### Step 2: Update GitHub Actions

**.github/workflows/release.yml**:

```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write # Required for OIDC

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"
          registry-url: "https://registry.npmjs.org"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm exec semantic-release
```

## Gotchas and Best Practices

### 1. Authentication Tokens

- Use **NPM_TOKEN** for npm publishing (or configure via `.npmrc`)
- Use **GITHUB_TOKEN** for GitHub releases (automatically provided)
- Store tokens as GitHub Secrets

### 2. Branch Protection

If branch protection is enabled, the automatically generated `GITHUB_TOKEN` cannot push commits. Workarounds:

- Disable branch protection for release branches
- Use a Personal Access Token with admin permissions (security risk)
- Skip committing package.json changes (recommended)

### 3. Fetch Depth

Set `fetch-depth: 0` to fetch all commits for proper version analysis:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
```

### 4. Circular Dependencies

Be careful with inter-package dependencies:

```json
// sdk-react/package.json
{
  "peerDependencies": {
    "@tributary-so/sdk": "workspace:*"
  }
}
```

### 5. Independent vs Synchronized Versions

**Independent** (recommended):

- Each package versions independently
- Better for public packages
- Use `semantic-release-monorepo`

**Synchronized**:

- All packages share the same version
- Use when packages are tightly coupled
- Use Lerna or Nx Release

### 6. NPM Provenance

Enable npm provenance for supply-chain security:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "lts/*"
    registry-url: "https://registry.npmjs.org"
    provenance: true
```

### 7. Preview Releases

Configure channel-based releases:

```json
// .releaserc
{
  "branches": [
    "main",
    {
      "name": "next",
      "prerelease": true
    }
  ]
}
```

### 8. Dry Run Mode

Test without publishing:

```bash
# Dry run (local testing)
npx semantic-release --dry-run

# With semantic-release-monorepo
npx semantic-release-monorepo --dry-run
```

### 9. Release Conditions

Prevent unnecessary releases:

```json
// .releaserc
{
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "releaseRules": [
          { "type": " chore", "release": false },
          { "type": "docs", "release": false },
          { "type": "refactor", "release": false }
        ]
      }
    ]
  ]
}
```

### 10. Program ID Tagging

For Solana programs, tag releases with program IDs:

```bash
# After semantic-release creates the tag
git tag -d programs@v1.0.0
git tag programs@v1.0.0 -m "Program ID: ABC123..."
```

## Summary Recommendations

| Aspect         | Recommendation                                |
| -------------- | --------------------------------------------- |
| **Tool**       | `semantic-release-monorepo`                   |
| **Versioning** | Independent per package                       |
| **Tags**       | `package@v1.0.0` format                       |
| **Commits**    | Scoped to package (e.g., `feat(sdk)`)         |
| **Auth**       | NPM trusted publishing + GITHUB_TOKEN         |
| **CI**         | GitHub Actions with separate jobs per package |
| **Solana**     | GitHub releases with program binaries         |
| **Changelog**  | Per-package changelog files                   |

## Additional Resources

- [Semantic Release Documentation](https://semantic-release.gitbook.io/semantic-release/)
- [semantic-release-monorepo GitHub](https://github.com/pmowrer/semantic-release-monorepo)
- [multi-semantic-release](https://github.com/qiwi/multi-semantic-release)
- [Nx Release Documentation](https://nx.dev/docs/guides/nx-release)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [NPM Trusted Publishing](https://docs.npmjs.com/trusted-publishers)
