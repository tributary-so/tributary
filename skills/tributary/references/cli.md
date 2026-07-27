# Tributary CLI Reference

`@tributary-so/cli` v1.8.0 — command-line interface for the Tributary Solana recurring payment protocol. All commands emit structured JSON to stdout. Transaction commands require a funded keypair; read-only commands use a throwaway generated keypair.

```
npm install -g @tributary-so/cli
# or
pnpm add -g @tributary-so/cli
```

Binary name: `tributary`. Topic separator: space.

```
tributary <topic> <command> [flags]
```

---

## Global Flags

Every command inherits these flags from `BaseCommand`:

| Flag               | Short | Default                         | Env          | Description               |
| ------------------ | ----- | ------------------------------- | ------------ | ------------------------- |
| `--connection-url` | `-c`  | `https://api.devnet.solana.com` | `SOLANA_API` | Solana RPC endpoint       |
| `--keypath`        | `-k`  | `keypair.json`                  | `KEY_PATH`   | Path to JSON keypair file |

Read-only commands (`config show`, `user list`, `gateway list`, `pda *`) ignore `--keypath`.

### Environment Variables

| Variable     | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `SOLANA_API` | Default RPC connection URL                                      |
| `KEY_PATH`   | Default path to keypair JSON file                               |
| `NO_DNA`     | When set, output is pretty-printed JSON (for agent consumption) |

---

## wallet

Wallet management — keypair creation, import, and balance queries.

### wallet address

Display the public key of the current wallet.

```
tributary wallet address
tributary wallet address --keypath ./my-wallet.json
```

| Flag                  | Short | Required | Description |
| --------------------- | ----- | -------- | ----------- |
| _(global flags only)_ |       |          |             |

**Output fields:** `publicKey`

---

### wallet balance

Display SOL and optional SPL token balances for the current wallet.

```
tributary wallet balance
tributary wallet balance --token-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

| Flag           | Short | Required | Description                     |
| -------------- | ----- | -------- | ------------------------------- |
| `--token-mint` | `-m`  | No       | SPL token mint address to query |

**Output fields:** `balance.lamports`, `balance.sol`, `publicKey`

---

### wallet create

Generate a new Solana keypair and save to file.

```
tributary wallet create
tributary wallet create --output my-wallet.json
```

| Flag       | Short | Required | Default        | Description      |
| ---------- | ----- | -------- | -------------- | ---------------- |
| `--output` | `-o`  | No       | `keypair.json` | Output file path |

**Output fields:** `publicKey`, `path`

---

### wallet import

Import an existing Solana keypair from a JSON file.

```
tributary wallet import ./my-wallet.json
```

| Argument | Required | Description               |
| -------- | -------- | ------------------------- |
| `path`   | Yes      | Path to keypair JSON file |

**Output fields:** `publicKey`, `path`

---

## program

Protocol configuration — program initialization.

### program initialize

Initialize the Tributary program. Sets the global `ProgramConfig` PDA with the specified admin.

```
tributary program initialize
tributary program initialize --admin <PUBKEY>
```

| Flag      | Short | Required | Default           | Description                                 |
| --------- | ----- | -------- | ----------------- | ------------------------------------------- |
| `--admin` | `-a`  | No       | Wallet public key | Admin public key for program initialization |

**Output fields:** `admin`, `transaction`

---

## config

Read-only protocol config inspection.

### config show

Show the global `ProgramConfig` account (read-only). `emergency_pause` has no on-chain setter via CLI.

```
tributary config show
tributary config show -c https://api.mainnet-beta.solana.com
```

| Flag                  | Short | Required | Description |
| --------------------- | ----- | -------- | ----------- |
| _(global flags only)_ |       |          |             |

**Output fields:** `config.address`, `config.admin`, `config.bump`, `config.emergencyPause`, `config.feeRecipient`, `config.protocolShareBps`

---

## user

User Payment accounts — create, list, inspect, and delete.

### user create

Create a user payment account for a specific token mint. The PDA seeds are `["user_payment", owner, mint]`.

```
tributary user create --token-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
tributary user create -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

| Flag           | Short | Required | Description            |
| -------------- | ----- | -------- | ---------------------- |
| `--token-mint` | `-m`  | Yes      | SPL token mint address |

**Output fields:** `tokenMint`, `transaction`

---

### user delete

Delete a user payment account. Closes the account and refunds rent to the owner. All associated policies must be deleted first.

```
tributary user delete --mint <MINT>
tributary user delete -m <MINT>
```

| Flag     | Short | Required | Description                                                  |
| -------- | ----- | -------- | ------------------------------------------------------------ |
| `--mint` | `-m`  | Yes      | SPL token mint address of the user payment account to delete |

**Output fields:** `mint`, `transaction`

---

### user list

List all user payment accounts.

```
tributary user list
```

| Flag                  | Short | Required | Description |
| --------------------- | ----- | -------- | ----------- |
| _(global flags only)_ |       |          |             |

**Output fields:** `count`, `users[].owner`, `users[].publicKey`, `users[].activePolicies`, `users[].totalPolicies`

---

### user show

Show details of a user payment account.

```
tributary user show --user-payment 9ZNTfG4Ny3g5HmM2qSyoF8eJ7dQeK61dnY6gMqDdKBgE
tributary user show -u 9ZNTfG4Ny3g5HmM2qSyoF8eJ7dQeK61dnY6gMqDdKBgE
```

| Flag             | Short | Required | Description                     |
| ---------------- | ----- | -------- | ------------------------------- |
| `--user-payment` | `-u`  | Yes      | User payment account public key |

**Output fields:** `userPayment.activePolicies`, `userPayment.createdAt`, `userPayment.owner`, `userPayment.publicKey`, `userPayment.tokenAccount`, `userPayment.tokenMint`, `userPayment.totalPolicies`

---

## gateway

Payment gateway management — create, configure, inspect, and delete gateways.

### gateway create

Create a new payment gateway.

```
tributary gateway create --authority ALICE --fee-bps 100 --fee-recipient BOB
tributary gateway create -a ALICE -b 100 -r BOB -n "My Gateway" -u https://example.com
```

| Flag              | Short | Required | Default           | Description                  |
| ----------------- | ----- | -------- | ----------------- | ---------------------------- |
| `--authority`     | `-a`  | Yes      |                   | Gateway authority public key |
| `--fee-bps`       | `-b`  | Yes      |                   | Gateway fee in basis points  |
| `--fee-recipient` | `-r`  | Yes      |                   | Fee recipient public key     |
| `--name`          | `-n`  | No       | `Unnamed Gateway` | Gateway display name         |
| `--url`           | `-u`  | No       | `""`              | Gateway URL                  |

**Output fields:** `authority`, `feeBps`, `feeRecipient`, `name`, `url`, `transaction`

---

### gateway delete

Delete a payment gateway. The gateway must have no active policies.

```
tributary gateway delete --authority ALICE
```

| Flag          | Short | Required | Description                  |
| ------------- | ----- | -------- | ---------------------------- |
| `--authority` | `-a`  | Yes      | Gateway authority public key |

**Output fields:** `authority`, `transaction`

---

### gateway list

List all payment gateways.

```
tributary gateway list
```

| Flag                  | Short | Required | Description |
| --------------------- | ----- | -------- | ----------- |
| _(global flags only)_ |       |          |             |

**Output fields:** `count`, `gateways[].active`, `gateways[].authority`, `gateways[].feeBps`, `gateways[].feeRecipient`, `gateways[].name`, `gateways[].publicKey`, `gateways[].signer`, `gateways[].featureFlags`, `gateways[].schedulerShareBps`, `gateways[].referralAllocationBps`, `gateways[].referralTiersBps`, `gateways[].customProtocolShareBps`

---

### gateway show

Show detailed information about a payment gateway.

```
tributary gateway show --gateway GATEWAY_PUBKEY
```

| Flag        | Short | Required | Description                   |
| ----------- | ----- | -------- | ----------------------------- |
| `--gateway` | `-g`  | Yes      | Gateway public key to inspect |

**Output fields:** `gateway.active`, `gateway.authority`, `gateway.feeBps`, `gateway.feeRecipient`, `gateway.name`, `gateway.publicKey`, `gateway.url`, `gateway.featureFlags`

---

### gateway signer

Change the gateway signer authorized to execute payments. The signer is the keypair that signs `execute_payment` transactions on behalf of the gateway.

```
tributary gateway signer --authority ALICE --new-signer BOB
```

| Flag           | Short | Required | Description                          |
| -------------- | ----- | -------- | ------------------------------------ |
| `--authority`  | `-a`  | Yes      | Current gateway authority public key |
| `--new-signer` | `-s`  | Yes      | New signer public key                |

**Output fields:** `authority`, `newSigner`, `transaction`

---

### gateway fee-bps

Change the gateway fee in basis points.

```
tributary gateway fee-bps --authority ALICE --fee-bps 200
```

| Flag          | Short | Required | Description                  |
| ------------- | ----- | -------- | ---------------------------- |
| `--authority` | `-a`  | Yes      | Gateway authority public key |
| `--fee-bps`   | `-b`  | Yes      | New fee in basis points      |

**Output fields:** `authority`, `feeBps`, `transaction`

---

### gateway fee-recipient

Change the fee recipient for a payment gateway.

```
tributary gateway fee-recipient --authority ALICE --new-recipient BOB
```

| Flag              | Short | Required | Description                  |
| ----------------- | ----- | -------- | ---------------------------- |
| `--authority`     | `-a`  | Yes      | Gateway authority public key |
| `--new-recipient` | `-r`  | Yes      | New fee recipient public key |

**Output fields:** `authority`, `newRecipient`, `transaction`

---

### gateway protocol-fee

Set a custom per-gateway protocol fee share. Requires protocol-admin authority and the `FEATURE_CUSTOM_PROTOCOL_FEE` flag enabled on the gateway.

```
tributary gateway protocol-fee --authority GATEWAY_AUTH --enable --share-bps 50
tributary gateway protocol-fee --authority GATEWAY_AUTH --disable
```

| Flag          | Short | Required | Default | Description                                                                    |
| ------------- | ----- | -------- | ------- | ------------------------------------------------------------------------------ |
| `--authority` | `-a`  | Yes      |         | Gateway authority public key                                                   |
| `--enable`    | `-e`  | No       |         | Enable custom protocol fee share (exclusive with `--disable`)                  |
| `--disable`   | `-d`  | No       |         | Disable custom protocol fee, revert to global rate (exclusive with `--enable`) |
| `--share-bps` | `-s`  | No       | `0`     | Protocol share in bps (0–10000)                                                |

One of `--enable` or `--disable` is required.

**Output fields:** `authority`, `customProtocolShareBps`, `useCustomProtocolFee`, `transaction`

---

### gateway referral-settings

Update gateway referral settings. Gateway-authority only. See ADR-0005/ADR-0011.

```
tributary gateway referral-settings --authority ALICE --referral-allocation-bps 1000 --referral-tiers-bps 5000,3000,2000
```

| Flag                        | Short | Required | Description                                                     |
| --------------------------- | ----- | -------- | --------------------------------------------------------------- |
| `--authority`               | `-a`  | Yes      | Gateway authority public key                                    |
| `--referral-allocation-bps` | `-b`  | Yes      | Referral allocation share of the gateway fee (max 2500 bps)     |
| `--referral-tiers-bps`      | `-t`  | Yes      | Three L1/L2/L3 tier shares (comma-separated, must sum to 10000) |

**Output fields:** `authority`, `referralAllocationBps`, `referralTiersBps`, `transaction`

---

### gateway feature-flags

Update gateway feature flags. Gateway-authority only. `CUSTOM_PROTOCOL_FEE` is admin-only.

Available flag names: `REFERRAL`, `CUSTOM_PROTOCOL_FEE`, `NET_AMOUNT` (and any other names defined in `GATEWAY_FEATURES` in the SDK).

```
tributary gateway feature-flags --enable REFERRAL
tributary gateway feature-flags --disable REFERRAL
tributary gateway feature-flags --set 0x03
```

| Flag        | Short | Required | Description                                                                       |
| ----------- | ----- | -------- | --------------------------------------------------------------------------------- |
| `--enable`  | `-e`  | No       | Feature flag to enable by name or hex value (exclusive with `--disable`, `--set`) |
| `--disable` | `-d`  | No       | Feature flag to disable by name or hex value (exclusive with `--enable`, `--set`) |
| `--set`     | `-s`  | No       | Raw feature flags byte as hex (exclusive with `--enable`, `--disable`)            |

Exactly one of `--enable`, `--disable`, or `--set` is required.

**Output fields:** `authority`, `operation`, `value`, `transaction`

---

## policy

Payment policies — create, list, and manage status.

### policy create

Create a payment policy (subscription / milestone / pay-as-you-go). Creates the UserPayment PDA if it does not exist.

```
tributary policy create --variant subscription -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000
tributary policy create --variant milestone -m <MINT> -r <RECIPIENT> -g <GATEWAY> --amounts 1000,2000 --timestamps 1700000000,1800000000 --release-condition 1
tributary policy create --variant pay-as-you-go -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-per-period 1000000 --max-chunk 100000 --period-seconds 86400
```

| Flag                  | Short | Required | Default        | Description                                                                                  |
| --------------------- | ----- | -------- | -------------- | -------------------------------------------------------------------------------------------- |
| `--variant`           | `-v`  | No       | `subscription` | Policy type: `subscription`, `milestone`, `pay-as-you-go`                                    |
| `--token-mint`        | `-m`  | Yes      |                | SPL token mint address                                                                       |
| `--recipient`         | `-r`  | Yes      |                | Payment recipient public key                                                                 |
| `--gateway`           | `-g`  | Yes      |                | Payment gateway public key                                                                   |
| `--amount`            | `-a`  | Cond.    |                | `[subscription]` Payment amount in smallest token unit                                       |
| `--auto-renew`        |       | No       | `true`         | `[subscription]` Auto-renew toggle                                                           |
| `--max-renewals`      |       | No       |                | `[subscription]` Maximum number of renewals                                                  |
| `--frequency`         | `-f`  | No       | `monthly`      | `[subscription]` Payment frequency: `daily`, `weekly`, `monthly`, `yearly`                   |
| `--amounts`           |       | Cond.    |                | `[milestone]` Comma-separated milestone amounts (up to 4)                                    |
| `--timestamps`        |       | Cond.    |                | `[milestone]` Comma-separated milestone due timestamps (unix seconds)                        |
| `--release-condition` |       | No       | `1`            | `[milestone]` Release bitmap: bit0=due-date, bit1=gateway, bit2=owner, bit3=recipient        |
| `--max-per-period`    |       | Cond.    |                | `[pay-as-you-go]` Max amount per period                                                      |
| `--max-chunk`         |       | Cond.    |                | `[pay-as-you-go]` Max amount per chunk                                                       |
| `--period-seconds`    |       | Cond.    |                | `[pay-as-you-go]` Period length in seconds                                                   |
| `--expiry`            |       | No       |                | `[pay-as-you-go]` Optional overall expiry (unix seconds); execution rejected after this time |
| `--memo`              |       | No       |                | Memo to attach to the policy (max 64 chars)                                                  |

**Required per variant:**

- `subscription`: `--amount`
- `milestone`: `--amounts`, `--timestamps`
- `pay-as-you-go`: `--max-per-period`, `--max-chunk`, `--period-seconds`

**Release condition bitmap values:**

| Bit | Value | Meaning          |
| --- | ----- | ---------------- |
| 0   | 1     | Due-date check   |
| 1   | 2     | Gateway signer   |
| 2   | 4     | Owner signer     |
| 3   | 8     | Recipient signer |

Bits 1–3 are mutually exclusive.

**Output fields:** `variant`, `gateway`, `recipient`, `tokenMint`, `transaction`, plus variant-specific summary fields.

---

### policy list

List payment policies for a user payment account.

```
tributary policy list --user-payment <USER_PAYMENT_PUBKEY>
tributary policy list -u <USER_PAYMENT_PUBKEY>
```

| Flag             | Short | Required | Description                     |
| ---------------- | ----- | -------- | ------------------------------- |
| `--user-payment` | `-u`  | Yes      | User payment account public key |

**Output fields:** `policiesCount`, `policies[].policyId`, `policies[].policyType`, `policies[].status`, `policies[].totalPaid`, `policies[].memo`, `policies[].publicKey`

---

### policy status

Change a payment policy status (pause, resume, or delete).

```
tributary policy status -m <MINT> -p 1 --status paused
tributary policy status -m <MINT> -p 1 --status active
tributary policy status -m <MINT> -p 1 --status deleted
```

| Flag           | Short | Required | Description                               |
| -------------- | ----- | -------- | ----------------------------------------- |
| `--token-mint` | `-m`  | Yes      | Token mint address                        |
| `--policy-id`  | `-p`  | Yes      | Policy ID number                          |
| `--status`     | `-s`  | Yes      | New status: `paused`, `active`, `deleted` |

Setting status to `deleted` closes the policy account and refunds rent. `paused` and `active` toggle execution eligibility.

**Output fields:** `policyId`, `status`, `tokenMint`, `transaction`

---

## delegate

Token delegate lifecycle — approve, revoke, and migrate.

### delegate approve

Approve the UserPayment PDA as token delegate on the source ATA. Required before `execute_payment` or `execute_composable` can succeed. See ADR-0001.

```
tributary delegate approve --mint <MINT> --amount 1000000
tributary delegate approve --mint <MINT> --amount unlimited
```

| Flag       | Short | Required | Description                                                          |
| ---------- | ----- | -------- | -------------------------------------------------------------------- |
| `--mint`   | `-m`  | Yes      | SPL token mint address                                               |
| `--amount` | `-a`  | Yes      | Delegated amount in smallest token unit, or `unlimited` for u64::MAX |

**Output fields:** `amount`, `delegate`, `mint`, `transaction`

---

### delegate revoke

Revoke the token delegate from the source ATA. Subsequent `execute_payment` and `execute_composable` calls fail until re-approved.

```
tributary delegate revoke --mint <MINT>
```

| Flag     | Short | Required | Description            |
| -------- | ----- | -------- | ---------------------- |
| `--mint` | `-m`  | Yes      | SPL token mint address |

**Output fields:** `mint`, `transaction`

---

### delegate migrate

Migrate from the legacy global `PaymentsDelegate` PDA to the per-mint `UserPayment` PDA delegate. See ADR-0001 back-compatibility bridge.

```
tributary delegate migrate --mint <MINT> --amount 1000000
tributary delegate migrate --mint <MINT> --amount unlimited
```

| Flag       | Short | Required | Description                                                          |
| ---------- | ----- | -------- | -------------------------------------------------------------------- |
| `--mint`   | `-m`  | Yes      | SPL token mint address                                               |
| `--amount` | `-a`  | Yes      | Delegated amount in smallest token unit, or `unlimited` for u64::MAX |

**Output fields:** `amount`, `mint`, `transaction`

---

## composable

Composable pull payments — create, execute, status, and delete. See ADR-0007.

### composable create

Create a composable pull-payment policy with optional validation and forward hooks.

```
tributary composable create --variant pay-as-you-go -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-per-period 100000000 --max-chunk 50000000 --period-seconds 2592000
tributary composable create -m <MINT> -r <RECIPIENT> -g <GATEWAY> --variant subscription -a 1000000 --frequency monthly --validation guard.json
```

| Flag                      | Short | Required | Default        | Description                                                                          |
| ------------------------- | ----- | -------- | -------------- | ------------------------------------------------------------------------------------ |
| `--variant`               | `-v`  | No       | `subscription` | PolicyType variant: `subscription`, `milestone` (not yet supported), `pay-as-you-go` |
| `--token-mint`            | `-m`  | Yes      |                | SPL input token mint                                                                 |
| `--recipient`             | `-r`  | Yes      |                | Recipient public key (output-mint delivery target)                                   |
| `--gateway`               | `-g`  | Yes      |                | Gateway public key                                                                   |
| `--amount`                | `-a`  | Cond.    |                | `[subscription]` Amount in smallest token unit                                       |
| `--frequency`             | `-f`  | No       | `monthly`      | `[subscription]` Frequency: `daily`, `weekly`, `monthly`, `yearly`                   |
| `--max-per-period`        |       | Cond.    |                | `[pay-as-you-go]` Max amount per period                                              |
| `--max-chunk`             |       | Cond.    |                | `[pay-as-you-go]` Max chunk amount                                                   |
| `--period-seconds`        |       | Cond.    |                | `[pay-as-you-go]` Period length in seconds                                           |
| `--expiry`                |       | No       |                | `[pay-as-you-go]` Optional overall expiry (unix seconds)                             |
| `--validation`            |       | No       |                | Lighthouse validation spec JSON file path (or `-` for stdin). Omit to disable.       |
| `--forward`               |       | No       |                | Forward program public key (enables swap hook). Omit for same-mint topup.            |
| `--forward-discriminator` |       | Cond.    |                | Hex forward-instruction discriminator (required when `--forward` is set)             |
| `--output-mint`           |       | No       | Token mint     | Forward output mint                                                                  |
| `--min-output`            |       | No       |                | Minimum NET (post-fee) output amount                                                 |
| `--native-output`         |       | No       | `false`        | Unwrap WSOL to SOL via closeAccount sweep (requires output-mint = WSOL)              |
| `--memo`                  |       | No       |                | Policy memo (max 32 chars)                                                           |

**Validation JSON format (`--validation`):**

```json
{
  "kind": "tokenAccount",
  "target": "<ACCOUNT_PUBKEY>",
  "assertions": [{ "field": "amount", "operator": "<", "value": 50000000 }]
}
```

Supported `kind` values: `accountData`, `accountDelta`, `accountInfo`, `merkleTree`, `mintAccount`, `stakeAccount`, `sysvarClock`, `tokenAccount`. For `accountDelta`, a second target (`targetB`) is accepted.

**Output fields:** `variant`, `forward`, `validation`, `recipient`, `tokenMint`, `transaction`

---

### composable delete

Delete a composable policy permanently. Closes the account and refunds rent.

```
tributary composable delete -m <MINT> -p 1
```

| Flag           | Short | Required | Description                 |
| -------------- | ----- | -------- | --------------------------- |
| `--token-mint` | `-m`  | Yes      | Token mint address          |
| `--policy-id`  | `-p`  | Yes      | Composable policy ID number |

**Output fields:** `policyId`, `tokenMint`, `transaction`

---

### composable execute

Execute a composable policy. The caller must be the gateway signer. The scheduler loop is off-chain (ADR-0014).

```
tributary composable execute <COMPOSABLE_POLICY_PUBKEY>
tributary composable execute <COMPOSABLE_POLICY_PUBKEY> --forward-ix fwd-instruction.bin
tributary composable execute <COMPOSABLE_POLICY_PUBKEY> --forward-amount 50000000
```

| Argument | Required | Description                  |
| -------- | -------- | ---------------------------- |
| `policy` | Yes      | Composable policy public key |

| Flag                    | Short | Required | Description                                                                               |
| ----------------------- | ----- | -------- | ----------------------------------------------------------------------------------------- |
| `--forward-ix`          |       | No       | Forward program instruction data file (or `-` for stdin). Empty when forward is disabled. |
| `--forward-amount`      |       | No       | Forward pull amount. PayAsYouGo only (ADR-0010). Rejected for subscription/milestone.     |
| `--forward-accounts`    |       | No       | Comma-separated forward program account pubkeys                                           |
| `--validation-accounts` |       | No       | Comma-separated Lighthouse target account pubkeys                                         |

**Output fields:** `policy`, `variant`, `transaction`

---

### composable status

Change a composable policy status.

```
tributary composable status -m <MINT> -p 1 --status paused
tributary composable status -m <MINT> -p 1 --status active
```

| Flag           | Short | Required | Description                                 |
| -------------- | ----- | -------- | ------------------------------------------- |
| `--token-mint` | `-m`  | Yes      | Token mint address                          |
| `--policy-id`  | `-p`  | Yes      | Composable policy ID number                 |
| `--status`     | `-s`  | Yes      | New status: `active`, `paused`, `completed` |

**Output fields:** `policyId`, `status`, `tokenMint`, `transaction`

---

## payment

Payment execution — trigger recurring payment processing.

### payment execute

Execute a recurring payment for a policy or user payment account. Permissionless — any wallet can call this. The signer must be the gateway signer.

```
tributary payment execute --policy <POLICY_PUBKEY>
tributary payment execute -p <POLICY_PUBKEY>
tributary payment execute --user-payment <USER_PAYMENT_PUBKEY>
tributary payment execute -u <USER_PAYMENT_PUBKEY>
```

| Flag             | Short | Required | Description                                                            |
| ---------------- | ----- | -------- | ---------------------------------------------------------------------- |
| `--policy`       | `-p`  | Cond.    | Payment policy public key to execute (exclusive with `--user-payment`) |
| `--user-payment` | `-u`  | Cond.    | User payment account public key (exclusive with `--policy`)            |

One of `--policy` or `--user-payment` is required.

**Output fields:** `policy`, `transaction`

---

### payment transfer

Transfer tokens via the Tributary fee+referral integrated transfer instruction. A standalone one-time transfer with fee routing. See ADR-0004.

```
tributary payment transfer -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000 --memo "invoice #42"
```

| Flag              | Short | Required | Description                                         |
| ----------------- | ----- | -------- | --------------------------------------------------- |
| `--token-mint`    | `-m`  | Yes      | SPL token mint address                              |
| `--recipient`     | `-r`  | Yes      | Recipient public key                                |
| `--gateway`       | `-g`  | Yes      | Gateway public key (routes fees + referral rewards) |
| `--amount`        | `-a`  | Yes      | Amount in smallest token unit                       |
| `--memo`          |       | No       | Memo string to attach                               |
| `--referral-code` |       | No       | Optional 6-char referral code                       |

**Output fields:** `amount`, `gateway`, `recipient`, `tokenMint`, `transaction`

---

## referral

Referral system — create referral accounts and query referral chains.

### referral create

Create a referral account under a gateway. Code is auto-generated if not provided.

```
tributary referral create --gateway GATEWAY_PUBKEY
tributary referral create --gateway GATEWAY_PUBKEY --code MYCODE
tributary referral create -g GATEWAY_PUBKEY -c MYCODE -r REFERRER_PUBKEY
```

| Flag         | Short | Required | Description                                       |
| ------------ | ----- | -------- | ------------------------------------------------- |
| `--gateway`  | `-g`  | Yes      | Gateway public key                                |
| `--code`     | `-c`  | No       | Referral code (6-char, auto-generated if omitted) |
| `--referrer` | `-r`  | No       | Referrer public key (for nested L2/L3 referrals)  |

**Output fields:** `code`, `gateway`, `referrer`, `transaction`

---

### referral chain

Show referral chain for an owner. Displays the L1/L2/L3 referrer hierarchy.

```
tributary referral chain --gateway GATEWAY_PUBKEY --owner OWNER_PUBKEY
tributary referral chain -g GATEWAY_PUBKEY -o OWNER_PUBKEY
```

| Flag        | Short | Required | Description                         |
| ----------- | ----- | -------- | ----------------------------------- |
| `--gateway` | `-g`  | Yes      | Gateway public key                  |
| `--owner`   | `-o`  | Yes      | Owner public key to trace chain for |

**Output fields:** `chain.L1`, `chain.L2`, `chain.L3`, `owner`

---

### referral show

Show referral account by code.

```
tributary referral show --gateway GATEWAY_PUBKEY --code MYCODE
tributary referral show -g GATEWAY_PUBKEY -c MYCODE
```

| Flag        | Short | Required | Description              |
| ----------- | ----- | -------- | ------------------------ |
| `--gateway` | `-g`  | Yes      | Gateway public key       |
| `--code`    | `-c`  | Yes      | Referral code to look up |

**Output fields:** `referral.code`, `referral.gateway`, `referral.owner`, `referral.referrer`

---

### referral show-owner

Show referral account by owner public key.

```
tributary referral show-owner --gateway GATEWAY_PUBKEY --owner OWNER_PUBKEY
tributary referral show-owner -g GATEWAY_PUBKEY -o OWNER_PUBKEY
```

| Flag        | Short | Required | Description                 |
| ----------- | ----- | -------- | --------------------------- |
| `--gateway` | `-g`  | Yes      | Gateway public key          |
| `--owner`   | `-o`  | Yes      | Owner public key to look up |

**Output fields:** `referral.code`, `referral.owner`

---

## pda

PDA utilities — derive program-derived addresses for all account types.

### pda config

Get the program config PDA address.

```
tributary pda config
```

| Flag                  | Short | Required | Description |
| --------------------- | ----- | -------- | ----------- |
| _(global flags only)_ |       |          |             |

**Output fields:** `pda.address`, `pda.bump`, `pda.type`

---

### pda delegate

Get the payments delegate PDA address (legacy global delegate).

```
tributary pda delegate
```

| Flag                  | Short | Required | Description |
| --------------------- | ----- | -------- | ----------- |
| _(global flags only)_ |       |          |             |

**Output fields:** `pda.address`, `pda.bump`, `pda.type`

---

### pda gateway

Get gateway PDA address for a given authority.

```
tributary pda gateway --authority GATEWAY_AUTHORITY_PUBKEY
```

| Flag          | Short | Required | Description                  |
| ------------- | ----- | -------- | ---------------------------- |
| `--authority` | `-a`  | Yes      | Gateway authority public key |

**Output fields:** `pda.address`, `pda.authority`, `pda.bump`, `pda.type`, `pda.data`

---

### pda payment-policy

Get payment policy PDA address.

```
tributary pda payment-policy --user-payment USER_PAYMENT_PUBKEY --policy-id 1
```

| Flag             | Short | Required | Description                     |
| ---------------- | ----- | -------- | ------------------------------- |
| `--user-payment` | `-u`  | Yes      | User payment account public key |
| `--policy-id`    | `-p`  | Yes      | Policy ID number                |

**Output fields:** `pda.address`, `pda.bump`, `pda.policyId`, `pda.type`, `pda.userPayment`, `pda.data`

---

### pda user-payment

Get user payment PDA address.

```
tributary pda user-payment --user USER_PUBKEY --token-mint MINT_PUBKEY
```

| Flag           | Short | Required | Description             |
| -------------- | ----- | -------- | ----------------------- |
| `--user`       | `-u`  | Yes      | User (owner) public key |
| `--token-mint` | `-m`  | Yes      | Token mint public key   |

**Output fields:** `pda.address`, `pda.bump`, `pda.tokenMint`, `pda.type`, `pda.user`, `pda.data`

---

## Common Workflows

### New User Onboarding

Complete setup for a user to receive recurring payments in USDC.

```bash
# 1. Create a wallet (or import existing)
tributary wallet create -o ./payer.json

# 2. Check balance
tributary wallet balance -k ./payer.json

# 3. Create user payment account for USDC
tributary user create -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -k ./payer.json

# 4. Approve delegate (required before execution)
tributary delegate approve -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -a unlimited -k ./payer.json

# 5. Verify the delegate is set
tributary pda user-payment -u <WALLET_PUBKEY> -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Subscription Lifecycle

Create, execute, pause, resume, and delete a subscription policy.

```bash
# 1. Create gateway (one-time setup per authority)
tributary gateway create -a <GATEWAY_AUTH> -b 100 -r <FEE_RECIPIENT> -k ./gateway-authority.json

# 2. Create subscription policy
tributary policy create \
  --variant subscription \
  -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -r <RECIPIENT> \
  -g <GATEWAY_PUBKEY> \
  -a 10000000 \
  --frequency monthly \
  --auto-renew \
  --max-renewals 12 \
  --memo "Pro plan" \
  -k ./payer.json

# 3. Execute the payment (called by gateway signer, permissionless)
tributary payment execute -p <POLICY_PUBKEY> -k ./gateway-signer.json

# 4. Pause the policy
tributary policy status -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -p <POLICY_ID> --status paused -k ./payer.json

# 5. Resume the policy
tributary policy status -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -p <POLICY_ID> --status active -k ./payer.json

# 6. Delete the policy
tributary policy status -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -p <POLICY_ID> --status deleted -k ./payer.json
```

### Referral Setup

Configure a gateway with referral rewards and create referral accounts.

```bash
# 1. Enable REFERRAL feature flag on gateway
tributary gateway feature-flags --enable REFERRAL -k ./gateway-authority.json

# 2. Configure referral settings (10% allocation, 3-tier split)
tributary gateway referral-settings \
  -a <GATEWAY_AUTH> \
  -b 1000 \
  -t 5000,3000,2000 \
  -k ./gateway-authority.json

# 3. Create a referral account (auto-generated code)
tributary referral create -g <GATEWAY_PUBKEY> -k ./referrer.json

# 4. Create a nested referral (L2 under the L1 referrer)
tributary referral create -g <GATEWAY_PUBKEY> -r <L1_REFERRER_PUBKEY> -k ./referrer-l2.json

# 5. Look up a referral by code
tributary referral show -g <GATEWAY_PUBKEY> -c MYCODE

# 6. Trace the full referral chain for an owner
tributary referral chain -g <GATEWAY_PUBKEY> -o <OWNER_PUBKEY>

# 7. Transfer with referral code
tributary payment transfer \
  -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -r <RECIPIENT> \
  -g <GATEWAY_PUBKEY> \
  -a 5000000 \
  --referral-code MYCODE \
  -k ./payer.json
```

### Composable Policy with Validation Guard

Create a composable policy that checks on-chain state before executing.

```bash
# 1. Create validation spec JSON
cat > guard.json << 'EOF'
{
  "kind": "tokenAccount",
  "target": "<HOT_WALLET_USDC_ATA>",
  "assertions": [
    { "field": "amount", "operator": "<", "value": 50000000 }
  ]
}
EOF

# 2. Create composable policy with validation
tributary composable create \
  --variant pay-as-you-go \
  -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -r <RECIPIENT> \
  -g <GATEWAY_PUBKEY> \
  --max-per-period 100000000 \
  --max-chunk 50000000 \
  --period-seconds 2592000 \
  --validation guard.json \
  -k ./payer.json

# 3. Execute the composable policy
tributary composable execute <COMPOSABLE_POLICY_PUBKEY> \
  --validation-accounts <HOT_WALLET_USDC_ATA> \
  -k ./gateway-signer.json
```
