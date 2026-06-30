# Composable hooks: sentinel-disabled, externally stored

Both composable hooks (validation, forward) are **opt-in via sentinel
values**, and the validation hook's assertion data is stored in a
**separate account**, not inline.

**Sentinel disable.** `validation_program = SystemProgram` disables
validation; `forward_config.target_program = Pubkey::default()` disables
forward. We chose sentinels over explicit `Option<…>`/`enabled: bool`
fields because the sentinel reuses an existing pubkey field that the
runtime already deserialises cheaply, and it preserves the fixed account
layout (no extra discriminant byte, no migration when a hook is added
or removed). A composable policy with both sentinels behaves like a
PaymentPolicy — pull from user, settle to recipient, no hooks — but
carries its own PDA namespace and an intermediate-ATA hop. This pattern
powers the simple cold→hot USDC topup flow. (bean tributary-1lil)

**External ValidationPda.** The assertion byte-blob is stored in a
separate `ValidationPda` account (`["composable_validation",
composable_policy]`, ≤1024 bytes), not inline on `ComposablePolicy`.
The original v1 design carried the data inline; the v2 refactor moved
it out (bean tributary-5guw). `ComposablePolicy` is fixed-size and
already large; carrying up to 1KB of variable-length assertion data
inline would either force a worst-case 1KB account for every policy or
require a variable-size account. A separate account is cheap (rent
refunded on policy delete), lazy-created only when validation is
enabled, and keeps `ComposablePolicy` stable as Lighthouse adds new
assertion families.

**Forward instruction is pinned at create-time.** When forward is
enabled, at least one `ByteRangeCheck` must pin the discriminator at
offset 0 of the forward instruction data. This stops a gateway from
swapping in an arbitrary instruction for the allowlisted program at
execute time — only the pinned instruction shape can land.
