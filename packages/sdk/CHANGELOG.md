# [@tributary-so/sdk-v2.3.1](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.3.0...@tributary-so/sdk-v2.3.1) (2026-07-29)

# [@tributary-so/sdk-v2.3.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.2.1...@tributary-so/sdk-v2.3.0) (2026-07-28)


### Features

* **composable:** add forward_program named account + CLMM swap via v0 ALT ([25a165b](https://github.com/tributary-so/tributary/commit/25a165bb78d7f5bf961b020024963409c6084ea6))

# [@tributary-so/sdk-v2.2.1](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.2.0...@tributary-so/sdk-v2.2.1) (2026-07-21)

# [@tributary-so/sdk-v2.2.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.1.0...@tributary-so/sdk-v2.2.0) (2026-07-17)

# [@tributary-so/sdk-v2.1.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.0.0...@tributary-so/sdk-v2.1.0) (2026-07-15)

# [@tributary-so/sdk-v2.0.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.14.0...@tributary-so/sdk-v2.0.0) (2026-07-13)


* 🐛 fix(referral): validate chain integrity at payment execution ([1b28155](https://github.com/tributary-so/tributary/commit/1b281558ae0566101784c4d31f48bb65537b980e))
* 💥 boom: release v2 ([80bf346](https://github.com/tributary-so/tributary/commit/80bf34600d5f05ba93a957258da0eee053b37f3e))


### BREAKING CHANGES

* This commit is to force the next major version.
* remaining_accounts layout changes from
  [L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]
to
  [payer_referral, L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]

New error variants: PayerReferralMismatch, DuplicateReferralAccount.

Tests: 9 Rust unit tests for topology; 2 integration tests proving
the on-chain code rejects an unbound chain and duplicate accounts.

Refs: tributary-361p

# [@tributary-so/sdk-v2.0.0-beta.5](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.0.0-beta.4...@tributary-so/sdk-v2.0.0-beta.5) (2026-07-13)

# [@tributary-so/sdk-v2.0.0-beta.4](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.0.0-beta.3...@tributary-so/sdk-v2.0.0-beta.4) (2026-07-13)

# [@tributary-so/sdk-v2.0.0-beta.3](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.0.0-beta.2...@tributary-so/sdk-v2.0.0-beta.3) (2026-07-09)

# [@tributary-so/sdk-v2.0.0-beta.2](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v2.0.0-beta.1...@tributary-so/sdk-v2.0.0-beta.2) (2026-07-09)

# [@tributary-so/sdk-v2.0.0-beta.1](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.15.0-beta.1...@tributary-so/sdk-v2.0.0-beta.1) (2026-07-07)


* 💥 boom: release v2 ([80bf346](https://github.com/tributary-so/tributary/commit/80bf34600d5f05ba93a957258da0eee053b37f3e))


### BREAKING CHANGES

* This commit is to force the next major version.

# [@tributary-so/sdk-v1.15.0-beta.1](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.14.0...@tributary-so/sdk-v1.15.0-beta.1) (2026-07-07)


* 🐛 fix(referral): validate chain integrity at payment execution ([1b28155](https://github.com/tributary-so/tributary/commit/1b281558ae0566101784c4d31f48bb65537b980e))


### BREAKING CHANGES

* remaining_accounts layout changes from
  [L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]
to
  [payer_referral, L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]

New error variants: PayerReferralMismatch, DuplicateReferralAccount.

Tests: 9 Rust unit tests for topology; 2 integration tests proving
the on-chain code rejects an unbound chain and duplicate accounts.

Refs: tributary-361p

# [@tributary-so/sdk-v1.14.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.13.0...@tributary-so/sdk-v1.14.0) (2026-06-11)

# [@tributary-so/sdk-v1.13.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.12.0...@tributary-so/sdk-v1.13.0) (2026-05-19)

# [@tributary-so/sdk-v1.12.0](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.11.6...@tributary-so/sdk-v1.12.0) (2026-05-07)

# [@tributary-so/sdk-v1.11.6](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.11.5...@tributary-so/sdk-v1.11.6) (2026-05-07)

# [@tributary-so/sdk-v1.11.5](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.11.4...@tributary-so/sdk-v1.11.5) (2026-05-07)

# [@tributary-so/sdk-v1.11.4](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.11.3...@tributary-so/sdk-v1.11.4) (2026-05-07)

# [@tributary-so/sdk-v1.11.3](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.11.2...@tributary-so/sdk-v1.11.3) (2026-05-07)

# [@tributary-so/sdk-v1.11.2](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.11.1...@tributary-so/sdk-v1.11.2) (2026-05-07)
