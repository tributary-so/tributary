# [@tributary-so/sdk-v1.1.0-beta.1](https://github.com/tributary-so/tributary/compare/@tributary-so/sdk-v1.0.0...@tributary-so/sdk-v1.1.0-beta.1) (2026-07-07)


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
