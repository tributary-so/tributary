# Error Codes

Anchor's `#[error_code]` macro assigns each variant a numeric code
**positionally**, starting at `6000`. The code is `(6000 + variant_index)`.
Below is the full table for `TributaryError`
(`programs/tributary/src/error.rs`).

Codes are **stable as long as variant order is preserved** — inserting or
reordering variants in `error.rs` shifts every downstream code. Treat the
names, not the numbers, as the source of truth when grepping logs.

## All errors (58 variants)

### General / Validation

| Code | Name                            | Message                                                    | Remediation                                                                                                                                             |
| ---- | ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6000 | `ProgramPaused`                 | Program is paused                                          | Wait for admin to clear `ProgramConfig.emergency_pause`, or check you are not hitting it intentionally.                                                 |
| 6001 | `InvalidAmount`                 | Amount must be greater than zero                           | Pass `amount > 0` on policy creation.                                                                                                                   |
| 6002 | `InvalidFrequency`              | Invalid payment frequency                                  | Use a `PaymentFrequency` variant; for `Custom`, the interval in seconds must be non-zero.                                                               |
| 6003 | `Unauthorized`                  | Unauthorized                                               | Signer is not the `owner` / `authority` / `admin` of the relevant account.                                                                              |
| 6004 | `InvalidPolicyStatusTransition` | Invalid policy status transition                           | `Paused → Active → Paused` is the only allowed path for `PaymentPolicy`; `ComposablePolicy` adds `Completed`. Don't try to revive a `Completed` policy. |
| 6005 | `InsufficientDelegatedAmount`   | Insufficient delegated amount                              | Re-approve the delegate: `spl-token approve <user_ata> <UserPayment PDA> <amount>`. Delegate must cover `amount + fees`.                                |
| 6006 | `PaymentNotDue`                 | Payment is not yet due                                     | Wait until `next_payment_due` (Subscription/Milestone) or check period cap (PayAsYouGo).                                                                |
| 6007 | `InsufficientBalance`           | Insufficient balance for payment                           | Top up the user's ATA; the policy amount + fees exceeds the balance.                                                                                    |
| 6008 | `NoDelegateSet`                 | No or incorrect delegate set in ata                        | The ATA's delegate must be the `UserPayment` PDA (or legacy `PaymentsDelegate`). Approve the right PDA.                                                 |
| 6009 | `PolicyPaused`                  | Payment policy is paused                                   | Resume the policy via `change_payment_policy_status` / `change_composable_status` first.                                                                |
| 6010 | `InvalidInterval`               | Invalid Interval                                           | Custom interval must be `> 0` seconds.                                                                                                                  |
| 6011 | `InvalidFeeBps`                 | Invalid fee basis points                                   | `gateway_fee_bps` must be `<= 10000`.                                                                                                                   |
| 6012 | `InvalidPaymentDueDate`         | Invalid payment due date                                   | `next_payment_due` must be in the future at creation.                                                                                                   |
| 6013 | `ArithmeticOverflow`            | Arithmetic overflow                                        | Usually a fee configuration bug — combined BPS too high, or `amount` near `u64::MAX`. See `validate_combined_bps`.                                      |
| 6014 | `UnsupportedTokenExtension`     | Token-2022 Extension currently not supported               | Use a plain SPL mint (no TransferHook, TransferFee, etc.).                                                                                              |
| 6015 | `DistinctPubKeysRequired`       | Distinct Pubkeys required!                                 | Two accounts that must differ (e.g. referrer vs payer) are the same.                                                                                    |
| 6016 | `InvalidFeatureFlags`           | Invalid feature flags                                      | Bits outside the known mask were set on `feature_flags`.                                                                                                |
| 6017 | `HasActivePolicies`             | Cannot delete user payment with active policies            | Close or delete all `PaymentPolicy` children first.                                                                                                     |
| 6018 | `HasActiveComposables`          | Cannot delete user payment with active composable policies | Close or delete all `ComposablePolicy` children first.                                                                                                  |
| 6019 | `InvalidRentPayer`              | Invalid rent payer                                         | The `rent_payer` passed does not match the on-chain stored one (or is invalid).                                                                         |
| 6020 | `CombinedFeeBpsExceedsMax`      | Combined fee BPS must be less than 10000                   | `gateway_fee_bps + effective_protocol_fee_bps` must be **strictly less than** 10000. Lower one of them.                                                 |

### Referral

| Code | Name                                  | Message                                                  | Remediation                                                                                           |
| ---- | ------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 6021 | `InvalidReferralAllocation`           | Invalid referral allocation - must be <= 2500 bps        | `referral_allocation_bps` is bps **of the gateway fee**. Cap is 2500 (25%).                           |
| 6022 | `InvalidReferralTiers`                | Invalid referral tiers - must sum to 10000 bps           | `referral_tiers_bps` (3 entries) must sum to exactly 10000.                                           |
| 6023 | `CouldNotDeserializeReferrer`         | Could not deserialize referrer account                   | The account at that index is not a valid `ReferralAccount`. Check you passed the right PDAs in order. |
| 6024 | `ReferrerMustBeWritable`              | Referrer account must be writable                        | Mark the referrer `ReferralAccount` as writable in the ix (it earns rewards).                         |
| 6025 | `CircularReferralChain`               | Circular referral chain detected                         | A `ReferralAccount` is its own ancestor. Rebuild the chain.                                           |
| 6026 | `MaxReferralDepthExceeded`            | Maximum referral chain depth exceeded                    | Tributary supports up to **3 levels**. Trim the chain.                                                |
| 6027 | `InvalidReferralChainOrdering`        | Invalid referral chain ordering in remaining_accounts    | Pass `[direct_referrer, L2, L3]` in that order — leaf to root.                                        |
| 6028 | `InvalidReferralAccountDiscriminator` | Invalid referral account discriminator                   | Account is not a `ReferralAccount`.                                                                   |
| 6029 | `ReferralAccountSizeMismatch`         | Referral account size mismatch                           | Account was created with an older/different layout.                                                   |
| 6030 | `InvalidReferralCode`                 | Invalid referral code - must be alphanumeric             | 6-byte ASCII alphanumeric `[A-Za-z0-9]`.                                                              |
| 6031 | `ReferrerAccountInvalid`              | Referrer Account invalid                                 | Generic referrer-account mismatch. Re-derive the PDA.                                                 |
| 6032 | `ReferrerATAInvalid`                  | Referrer ATA invalid                                     | The referrer's ATA is missing or wrong owner.                                                         |
| 6033 | `ReferrerATAMintInvalid`              | Referrer ATA with invalid Mint                           | The referrer's ATA must be for the same mint as the payment.                                          |
| 6034 | `MissingReferralAta`                  | Missing ATA for ReferralAccount                          | Each referrer in the chain needs a matching token account for the payment mint.                       |
| 6035 | `PayerReferralMismatch`               | Payer ReferralAccount does not match the paying wallet   | The `ReferralAccount.owner` must equal the paying wallet.                                             |
| 6036 | `DuplicateReferralAccount`            | Duplicate ReferralAccount supplied in remaining_accounts | Each referrer must appear once.                                                                       |

### Token accounts

| Code | Name                                | Message                                                         | Remediation                                                |
| ---- | ----------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| 6037 | `InvalidTokenAccount`               | Invalid token account - mint mismatch or deserialization failed | Verify the ATA belongs to the right mint and owner.        |
| 6038 | `MismatchAtaReferralAccountNumbers` | Mismatch between number referrers and atas!                     | One ATA per referrer — counts must match.                  |
| 6039 | `TokenMintMismatch`                 | Token mint mismatch between accounts                            | All token accounts in the ix must reference the same mint. |

### Composable — Forward

| Code | Name                               | Message                                                                               | Remediation                                                                                                               |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 6040 | `InvalidForwardProgram`            | Forward program not whitelisted                                                       | `forward_config.target_program` must be in `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM). Use `Pubkey::default()` to disable. |
| 6041 | `ByteRangeCheckFailed`             | Byte range check failed                                                               | The forward instruction data did not match a pinned `ByteRangeCheck`. Re-check the instruction selector.                  |
| 6042 | `InsufficientOutputAmount`         | Insufficient output amount after forward CPI                                          | The forward produced less than `min_output_amount` (net of fees). Raise slippage tolerance or wait for better price.      |
| 6043 | `InsufficientByteRangeChecks`      | Must have at least one byte range check                                               | When forward is enabled, `num_data_checks >= 1`.                                                                          |
| 6044 | `DiscriminatorCheckRequired`       | At least one ByteRangeCheck must start at offset 0 to pin the instruction selector    | Add a check with `offset = 0` covering the program's first instruction byte(s).                                           |
| 6045 | `IntermediateAccountMismatch`      | Intermediate token account address does not match the derived ATA                     | Pass the ATA derived from `(ComposablePolicy PDA, mint)` as the intermediate.                                             |
| 6046 | `IntermediateAccountAlreadyExists` | Intermediate token account already exists — it must be freshly created each execution | Composables create + close the intermediate ATA per execution. Close any stale one.                                       |
| 6047 | `MissingForwardAccounts`           | Forward CPI requires at least one remaining account                                   | Pass the forward program's required accounts.                                                                             |
| 6048 | `ForwardProducedNoOutput`          | Forward CPI produced no output (intermediate output balance is zero)                  | Forward program didn't deliver tokens. Check pool liquidity / route.                                                      |
| 6049 | `ForwardDisabledRequiresSameMint`  | Forward disabled (target_program = default) requires input_mint == output_mint        | When you disable the forward, set `output_mint = input_mint` (same-mint topup pattern).                                   |
| 6050 | `NativeOutputRequiresWsol`         | NATIVE_OUTPUT forward flag requires output_mint == WSOL (NATIVE_MINT)                 | Either clear the flag, or set `output_mint = So111…111`.                                                                  |

### Composable — Validation

| Code | Name                       | Message                                             | Remediation                                                                                                   |
| ---- | -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 6051 | `InvalidValidationProgram` | Validation program not whitelisted                  | `validation_program` must be in `ALLOWED_VALIDATION_PROGRAMS` (Lighthouse). Use `SystemProgram` to disable.   |
| 6052 | `ValidationPdaMismatch`    | Validation PDA does not match derived address       | Re-derive `ValidationPda` from `["composable_validation", composable_policy]`.                                |
| 6053 | `ValidationDataTooLarge`   | Validation data exceeds maximum size                | Truncate to `MAX_VALIDATION_DATA_SIZE` (512 bytes).                                                           |
| 6054 | `ValidationDataRequired`   | Validation program set but no data provided         | Either supply validation data, or set `validation_program = SystemProgram`.                                   |
| 6055 | `ValidationNotRequired`    | Validation not configured but data was provided     | You passed assertion data with `validation_program = SystemProgram`. Either set the program or drop the data. |
| 6056 | `InvalidValidationPda`     | ValidationPDA is malformed — data_len out of bounds | The on-chain `data_len` exceeds 512. Account is corrupted.                                                    |

### Authorization (initialization)

| Code | Name                      | Message                                               | Remediation                                                  |
| ---- | ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| 6057 | `UnauthorizedInitializer` | Only the upgrade authority can initialize the program | `initialize` is upgrade-authority-gated. Sign with that key. |

> The legacy `Unauthorized` (6003) covers general authorization failures;
> `UnauthorizedInitializer` is specific to the program `initialize` call.

## Anchor framework errors

In addition to `TributaryError`, you may see Anchor's built-in errors
(`AnchorError` namespace, codes 100–4xxx range): `AccountNotInitialized`,
`AccountDiscriminatorMismatch`, `ConstraintHasOne`, `InsufficientFunds`,
etc. These are documented in the Anchor book; they share the same
transaction log format (`Error code: <number>`).
