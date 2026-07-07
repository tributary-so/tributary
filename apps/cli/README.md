# @tributary-so/cli

Tributary CLI — manage recurring payment policies, gateways, and composable pull payments on Solana.

## Usage

```sh
$ npm install -g @tributary-so/cli
$ tributary COMMAND
```

## Commands

<!-- commands -->
* [`cli composable create`](#cli-composable-create)
* [`cli composable delete`](#cli-composable-delete)
* [`cli composable execute POLICY`](#cli-composable-execute-policy)
* [`cli composable status`](#cli-composable-status)
* [`cli config show`](#cli-config-show)
* [`cli delegate approve`](#cli-delegate-approve)
* [`cli delegate migrate`](#cli-delegate-migrate)
* [`cli delegate revoke`](#cli-delegate-revoke)
* [`cli gateway create`](#cli-gateway-create)
* [`cli gateway delete`](#cli-gateway-delete)
* [`cli gateway feature-flags`](#cli-gateway-feature-flags)
* [`cli gateway fee-bps`](#cli-gateway-fee-bps)
* [`cli gateway fee-recipient`](#cli-gateway-fee-recipient)
* [`cli gateway list`](#cli-gateway-list)
* [`cli gateway protocol-fee`](#cli-gateway-protocol-fee)
* [`cli gateway referral-settings`](#cli-gateway-referral-settings)
* [`cli gateway show`](#cli-gateway-show)
* [`cli gateway signer`](#cli-gateway-signer)
* [`cli help [COMMAND]`](#cli-help-command)
* [`cli payment execute`](#cli-payment-execute)
* [`cli payment transfer`](#cli-payment-transfer)
* [`cli pda config`](#cli-pda-config)
* [`cli pda delegate`](#cli-pda-delegate)
* [`cli pda gateway`](#cli-pda-gateway)
* [`cli pda payment-policy`](#cli-pda-payment-policy)
* [`cli pda user-payment`](#cli-pda-user-payment)
* [`cli plugins`](#cli-plugins)
* [`cli plugins add PLUGIN`](#cli-plugins-add-plugin)
* [`cli plugins:inspect PLUGIN...`](#cli-pluginsinspect-plugin)
* [`cli plugins install PLUGIN`](#cli-plugins-install-plugin)
* [`cli plugins link PATH`](#cli-plugins-link-path)
* [`cli plugins remove [PLUGIN]`](#cli-plugins-remove-plugin)
* [`cli plugins reset`](#cli-plugins-reset)
* [`cli plugins uninstall [PLUGIN]`](#cli-plugins-uninstall-plugin)
* [`cli plugins unlink [PLUGIN]`](#cli-plugins-unlink-plugin)
* [`cli plugins update`](#cli-plugins-update)
* [`cli policy create`](#cli-policy-create)
* [`cli policy list`](#cli-policy-list)
* [`cli policy status`](#cli-policy-status)
* [`cli program initialize`](#cli-program-initialize)
* [`cli referral chain`](#cli-referral-chain)
* [`cli referral create`](#cli-referral-create)
* [`cli referral show`](#cli-referral-show)
* [`cli referral show-owner`](#cli-referral-show-owner)
* [`cli user create`](#cli-user-create)
* [`cli user delete`](#cli-user-delete)
* [`cli user list`](#cli-user-list)
* [`cli user show`](#cli-user-show)
* [`cli wallet address`](#cli-wallet-address)
* [`cli wallet balance`](#cli-wallet-balance)
* [`cli wallet create`](#cli-wallet-create)
* [`cli wallet import PATH`](#cli-wallet-import-path)

## `cli composable create`

Create a composable pull-payment policy (validation + optional forward hooks; ADR-0007/0009)

```
USAGE
  $ cli composable create -g <value> -r <value> -m <value> [-c <value>] [-k <value>] [-a <value>] [--forward <value>]
    [--forward-discriminator <value>] [-f daily|weekly|monthly|yearly] [--max-chunk <value>] [--max-per-period <value>]
    [--memo <value>] [--min-output <value>] [--native-output] [--output-mint <value>] [--period-seconds <value>]
    [--validation <value>] [-v subscription|milestone|pay-as-you-go]

FLAGS
  -a, --amount=<value>                 [subscription] Amount in smallest token unit
  -c, --connection-url=<value>         [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection
                                       URL (env: SOLANA_API)
  -f, --frequency=<option>             [default: monthly] [subscription] Frequency
                                       <options: daily|weekly|monthly|yearly>
  -g, --gateway=<value>                (required) Gateway public key
  -k, --keypath=<value>                [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>             (required) SPL input token mint
  -r, --recipient=<value>              (required) Recipient public key (output-mint delivery target)
  -v, --variant=<option>               [default: subscription] PolicyType variant
                                       <options: subscription|milestone|pay-as-you-go>
      --forward=<value>                Forward program public key (enables the swap hook). Omit to disable (same-mint
                                       topup sentinel).
      --forward-discriminator=<value>  Hex forward-instruction discriminator for offset-0 ByteRangeCheck (required when
                                       --forward is set)
      --max-chunk=<value>              [pay-as-you-go] Max chunk amount
      --max-per-period=<value>         [pay-as-you-go] Max amount per period
      --memo=<value>                   Policy memo (max 32 chars)
      --min-output=<value>             Minimum NET (post-fee) output amount
      --native-output                  Unwrap WSOL → SOL via closeAccount sweep (requires output-mint = WSOL)
      --output-mint=<value>            Forward output mint (defaults to token-mint for same-mint topup)
      --period-seconds=<value>         [pay-as-you-go] Period length in seconds
      --validation=<value>             Lighthouse validation spec JSON file path (or - for stdin). Omit to disable
                                       validation (SystemProgram sentinel).

DESCRIPTION
  Create a composable pull-payment policy (validation + optional forward hooks; ADR-0007/0009)

EXAMPLES
  $ cli composable create --variant pay-as-you-go -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-per-period 100000000 --max-chunk 50000000 --period-seconds 2592000

  $ cli composable create -m <MINT> -r <RECIPIENT> -g <GATEWAY> --variant subscription -a 1000000 --frequency monthly --validation guard.json
```

_See code: [src/commands/composable/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/composable/create.ts)_

## `cli composable delete`

Delete a composable policy permanently

```
USAGE
  $ cli composable delete -p <value> -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint address
  -p, --policy-id=<value>       (required) Composable policy ID number

DESCRIPTION
  Delete a composable policy permanently

EXAMPLES
  $ cli composable delete -m <MINT> -p 1
```

_See code: [src/commands/composable/delete.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/composable/delete.ts)_

## `cli composable execute POLICY`

Execute a composable policy (single relayer fire; the scheduler loop is off-chain per ADR-0014)

```
USAGE
  $ cli composable execute POLICY [-c <value>] [-k <value>] [--forward-accounts <value>] [--forward-amount <value>]
    [--forward-ix <value>] [--validation-accounts <value>]

ARGUMENTS
  POLICY  Composable policy public key

FLAGS
  -c, --connection-url=<value>       [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                     (env: SOLANA_API)
  -k, --keypath=<value>              [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
      --forward-accounts=<value>     Comma-separated forward program account pubkeys (for forward-enabled policies)
      --forward-amount=<value>       Forward pull amount (PayAsYouGo only; ADR-0010 #2). Rejected client-side for
                                     subscription/milestone.
      --forward-ix=<value>           Forward program instruction data file (or - for stdin). Empty when forward is
                                     disabled.
      --validation-accounts=<value>  Comma-separated Lighthouse target account pubkeys (for validation-enabled policies)

DESCRIPTION
  Execute a composable policy (single relayer fire; the scheduler loop is off-chain per ADR-0014)

EXAMPLES
  $ cli composable execute <COMPOSABLE_POLICY_PUBKEY>

  $ cli composable execute <COMPOSABLE_POLICY_PUBKEY> --forward-ix fwd-instruction.bin

  $ cli composable execute <COMPOSABLE_POLICY_PUBKEY> --forward-amount 50000000
```

_See code: [src/commands/composable/execute.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/composable/execute.ts)_

## `cli composable status`

Change a composable policy status (active / paused / completed)

```
USAGE
  $ cli composable status -p <value> -s active|paused|completed -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint address
  -p, --policy-id=<value>       (required) Composable policy ID number
  -s, --status=<option>         (required) New status
                                <options: active|paused|completed>

DESCRIPTION
  Change a composable policy status (active / paused / completed)

EXAMPLES
  $ cli composable status -m <MINT> -p 1 --status paused

  $ cli composable status -m <MINT> -p 1 --status active
```

_See code: [src/commands/composable/status.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/composable/status.ts)_

## `cli config show`

Show the global ProgramConfig (read-only; emergency_pause has no on-chain setter)

```
USAGE
  $ cli config show [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Show the global ProgramConfig (read-only; emergency_pause has no on-chain setter)

EXAMPLES
  $ cli config show

  $ cli config show -c https://api.mainnet-beta.solana.com
```

_See code: [src/commands/config/show.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/config/show.ts)_

## `cli delegate approve`

Approve the UserPayment PDA as token delegate on the source ATA (ADR-0001)

```
USAGE
  $ cli delegate approve -a <value> -m <value> [-c <value>] [-k <value>]

FLAGS
  -a, --amount=<value>          (required) Delegated amount in smallest token unit, or "unlimited" for u64::MAX
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --mint=<value>            (required) SPL token mint address

DESCRIPTION
  Approve the UserPayment PDA as token delegate on the source ATA (ADR-0001)

EXAMPLES
  $ cli delegate approve --mint <MINT> --amount 1000000

  $ cli delegate approve --mint <MINT> --amount unlimited
```

_See code: [src/commands/delegate/approve.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/delegate/approve.ts)_

## `cli delegate migrate`

Migrate from the legacy global PaymentsDelegate PDA to the per-mint UserPayment PDA delegate (ADR-0001 back-compat bridge)

```
USAGE
  $ cli delegate migrate -a <value> -m <value> [-c <value>] [-k <value>]

FLAGS
  -a, --amount=<value>          (required) Delegated amount in smallest token unit, or "unlimited" for u64::MAX
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --mint=<value>            (required) SPL token mint address

DESCRIPTION
  Migrate from the legacy global PaymentsDelegate PDA to the per-mint UserPayment PDA delegate (ADR-0001 back-compat
  bridge)

EXAMPLES
  $ cli delegate migrate --mint <MINT> --amount 1000000

  $ cli delegate migrate --mint <MINT> --amount unlimited
```

_See code: [src/commands/delegate/migrate.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/delegate/migrate.ts)_

## `cli delegate revoke`

Revoke the token delegate from the source ATA (subsequent payment execute fails until re-approved)

```
USAGE
  $ cli delegate revoke -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --mint=<value>            (required) SPL token mint address

DESCRIPTION
  Revoke the token delegate from the source ATA (subsequent payment execute fails until re-approved)

EXAMPLES
  $ cli delegate revoke --mint <MINT>
```

_See code: [src/commands/delegate/revoke.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/delegate/revoke.ts)_

## `cli gateway create`

Create a new payment gateway

```
USAGE
  $ cli gateway create -a <value> -b <value> -r <value> [-c <value>] [-k <value>] [-n <value>] [-u <value>]

FLAGS
  -a, --authority=<value>       (required) Gateway authority public key
  -b, --fee-bps=<value>         (required) Gateway fee in basis points
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -n, --name=<value>            [default: Unnamed Gateway] Gateway display name
  -r, --fee-recipient=<value>   (required) Fee recipient public key
  -u, --url=<value>             Gateway URL

DESCRIPTION
  Create a new payment gateway

EXAMPLES
  $ cli gateway create --authority ALICE --fee-bps 100 --fee-recipient BOB

  $ cli gateway create -a ALICE -b 100 -r BOB -n "My Gateway" -u https://example.com
```

_See code: [src/commands/gateway/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/create.ts)_

## `cli gateway delete`

Delete a payment gateway

```
USAGE
  $ cli gateway delete -a <value> [-c <value>] [-k <value>]

FLAGS
  -a, --authority=<value>       (required) Gateway authority public key
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Delete a payment gateway

EXAMPLES
  $ cli gateway delete --authority ALICE
```

_See code: [src/commands/gateway/delete.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/delete.ts)_

## `cli gateway feature-flags`

Update gateway feature flags (gateway authority only; CUSTOM_PROTOCOL_FEE is admin-only)

```
USAGE
  $ cli gateway feature-flags [-c <value>] [-k <value>] [-d <value> | -e <value> | -s <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -d, --disable=<value>         Feature flag to disable (REFERRAL, NET_AMOUNT, CUSTOM_PROTOCOL_FEE, PERMISSIONLESS), or
                                hex value
  -e, --enable=<value>          Feature flag to enable (REFERRAL, NET_AMOUNT, CUSTOM_PROTOCOL_FEE, PERMISSIONLESS), or
                                hex value
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -s, --set=<value>             Raw feature flags byte (hex, e.g. 0x03) to set directly

DESCRIPTION
  Update gateway feature flags (gateway authority only; CUSTOM_PROTOCOL_FEE is admin-only)

EXAMPLES
  $ cli gateway feature-flags --enable REFERRAL

  $ cli gateway feature-flags --disable REFERRAL

  $ cli gateway feature-flags --set 0x03
```

_See code: [src/commands/gateway/feature-flags.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/feature-flags.ts)_

## `cli gateway fee-bps`

Change the gateway fee in basis points

```
USAGE
  $ cli gateway fee-bps -a <value> -b <value> [-c <value>] [-k <value>]

FLAGS
  -a, --authority=<value>       (required) Gateway authority public key
  -b, --fee-bps=<value>         (required) New fee in basis points
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Change the gateway fee in basis points

EXAMPLES
  $ cli gateway fee-bps --authority ALICE --fee-bps 200
```

_See code: [src/commands/gateway/fee-bps.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/fee-bps.ts)_

## `cli gateway fee-recipient`

Change the fee recipient for a payment gateway

```
USAGE
  $ cli gateway fee-recipient -a <value> -r <value> [-c <value>] [-k <value>]

FLAGS
  -a, --authority=<value>       (required) Gateway authority public key
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -r, --new-recipient=<value>   (required) New fee recipient public key

DESCRIPTION
  Change the fee recipient for a payment gateway

EXAMPLES
  $ cli gateway fee-recipient --authority ALICE --new-recipient BOB
```

_See code: [src/commands/gateway/fee-recipient.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/fee-recipient.ts)_

## `cli gateway list`

List all payment gateways

```
USAGE
  $ cli gateway list [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  List all payment gateways

EXAMPLES
  $ cli gateway list
```

_See code: [src/commands/gateway/list.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/list.ts)_

## `cli gateway protocol-fee`

Set a custom per-gateway protocol fee share (protocol-admin only; effective only with FEATURE_CUSTOM_PROTOCOL_FEE)

```
USAGE
  $ cli gateway protocol-fee -a <value> [-c <value>] [-k <value>] [-d | -e] [-s <value>]

FLAGS
  -a, --authority=<value>       (required) Gateway authority public key
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -d, --disable                 Disable custom protocol fee (revert to global rate)
  -e, --enable                  Enable custom protocol fee share
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -s, --share-bps=<value>       Protocol share in bps (0-10000)

DESCRIPTION
  Set a custom per-gateway protocol fee share (protocol-admin only; effective only with FEATURE_CUSTOM_PROTOCOL_FEE)

EXAMPLES
  $ cli gateway protocol-fee --authority GATEWAY_AUTH --enable --share-bps 50

  $ cli gateway protocol-fee --authority GATEWAY_AUTH --disable
```

_See code: [src/commands/gateway/protocol-fee.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/protocol-fee.ts)_

## `cli gateway referral-settings`

Update gateway referral settings (gateway-authority only; ADR-0005/ADR-0011)

```
USAGE
  $ cli gateway referral-settings -a <value> -b <value> -t <value> [-c <value>] [-k <value>]

FLAGS
  -a, --authority=<value>                (required) Gateway authority public key
  -b, --referral-allocation-bps=<value>  (required) Referral allocation share of the gateway fee (bps, max 2500)
  -c, --connection-url=<value>           [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection
                                         URL (env: SOLANA_API)
  -k, --keypath=<value>                  [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -t, --referral-tiers-bps=<value>       (required) Three L1/L2/L3 tier shares (comma-sep, must sum to 10000)

DESCRIPTION
  Update gateway referral settings (gateway-authority only; ADR-0005/ADR-0011)

EXAMPLES
  $ cli gateway referral-settings --authority ALICE --referral-allocation-bps 1000 --referral-tiers-bps 5000,3000,2000
```

_See code: [src/commands/gateway/referral-settings.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/referral-settings.ts)_

## `cli gateway show`

Show detailed information about a payment gateway

```
USAGE
  $ cli gateway show -g <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -g, --gateway=<value>         (required) Gateway public key to inspect
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Show detailed information about a payment gateway

EXAMPLES
  $ cli gateway show --gateway GATEWAY_PUBKEY
```

_See code: [src/commands/gateway/show.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/show.ts)_

## `cli gateway signer`

Change the gateway signer authorized to execute payments

```
USAGE
  $ cli gateway signer -a <value> -s <value> [-c <value>] [-k <value>]

FLAGS
  -a, --authority=<value>       (required) Current gateway authority public key
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -s, --new-signer=<value>      (required) New signer public key

DESCRIPTION
  Change the gateway signer authorized to execute payments

EXAMPLES
  $ cli gateway signer --authority ALICE --new-signer BOB
```

_See code: [src/commands/gateway/signer.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/gateway/signer.ts)_

## `cli help [COMMAND]`

Display help for cli.

```
USAGE
  $ cli help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.49/src/commands/help.ts)_

## `cli payment execute`

Execute a recurring payment

```
USAGE
  $ cli payment execute [-c <value>] [-k <value>] [-p <value> | -u <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -p, --policy=<value>          Payment policy public key to execute
  -u, --user-payment=<value>    User payment account public key (alternative to policy)

DESCRIPTION
  Execute a recurring payment

EXAMPLES
  $ cli payment execute --policy <POLICY_PUBKEY>

  $ cli payment execute -p <POLICY_PUBKEY>

  $ cli payment execute --user-payment <USER_PAYMENT_PUBKEY>

  $ cli payment execute -u <USER_PAYMENT_PUBKEY>
```

_See code: [src/commands/payment/execute.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/payment/execute.ts)_

## `cli payment transfer`

Transfer tokens via the Tributary fee+referral integrated transfer instruction (ADR-0004)

```
USAGE
  $ cli payment transfer -a <value> -g <value> -r <value> -m <value> [-c <value>] [-k <value>] [--memo <value>]
    [--referral-code <value>]

FLAGS
  -a, --amount=<value>          (required) Amount in smallest token unit
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -g, --gateway=<value>         (required) Gateway public key (routes fees + referral rewards)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) SPL token mint address
  -r, --recipient=<value>       (required) Recipient public key
      --memo=<value>            Memo string to attach
      --referral-code=<value>   Optional 6-char referral code

DESCRIPTION
  Transfer tokens via the Tributary fee+referral integrated transfer instruction (ADR-0004)

EXAMPLES
  $ cli payment transfer -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000 --memo "invoice #42"
```

_See code: [src/commands/payment/transfer.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/payment/transfer.ts)_

## `cli pda config`

Get program config PDA address

```
USAGE
  $ cli pda config [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Get program config PDA address

EXAMPLES
  $ cli pda config
```

_See code: [src/commands/pda/config.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/pda/config.ts)_

## `cli pda delegate`

Get payments delegate PDA address

```
USAGE
  $ cli pda delegate [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Get payments delegate PDA address

EXAMPLES
  $ cli pda delegate
```

_See code: [src/commands/pda/delegate.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/pda/delegate.ts)_

## `cli pda gateway`

Get gateway PDA address

```
USAGE
  $ cli pda gateway -a <value> [-c <value>] [-k <value>]

FLAGS
  -a, --authority=<value>       (required) Gateway authority public key
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Get gateway PDA address

EXAMPLES
  $ cli pda gateway --authority GATEWAY_AUTHORITY_PUBKEY
```

_See code: [src/commands/pda/gateway.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/pda/gateway.ts)_

## `cli pda payment-policy`

Get payment policy PDA address

```
USAGE
  $ cli pda payment-policy -p <value> -u <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -p, --policy-id=<value>       (required) Policy ID number
  -u, --user-payment=<value>    (required) User payment account public key

DESCRIPTION
  Get payment policy PDA address

EXAMPLES
  $ cli pda payment-policy --user-payment USER_PAYMENT_PUBKEY --policy-id 1
```

_See code: [src/commands/pda/payment-policy.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/pda/payment-policy.ts)_

## `cli pda user-payment`

Get user payment PDA address

```
USAGE
  $ cli pda user-payment -m <value> -u <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint public key
  -u, --user=<value>            (required) User (owner) public key

DESCRIPTION
  Get user payment PDA address

EXAMPLES
  $ cli pda user-payment --user USER_PUBKEY --token-mint MINT_PUBKEY
```

_See code: [src/commands/pda/user-payment.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/pda/user-payment.ts)_

## `cli plugins`

List installed plugins.

```
USAGE
  $ cli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ cli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/index.ts)_

## `cli plugins add PLUGIN`

Installs a plugin into cli.

```
USAGE
  $ cli plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ cli plugins add myplugin

  Install a plugin from a github url.

    $ cli plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ cli plugins add someuser/someplugin
```

## `cli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ cli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ cli plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/inspect.ts)_

## `cli plugins install PLUGIN`

Installs a plugin into cli.

```
USAGE
  $ cli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ cli plugins install myplugin

  Install a plugin from a github url.

    $ cli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ cli plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/install.ts)_

## `cli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ cli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ cli plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/link.ts)_

## `cli plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ cli plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cli plugins unlink
  $ cli plugins remove

EXAMPLES
  $ cli plugins remove myplugin
```

## `cli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ cli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/reset.ts)_

## `cli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ cli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cli plugins unlink
  $ cli plugins remove

EXAMPLES
  $ cli plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/uninstall.ts)_

## `cli plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ cli plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cli plugins unlink
  $ cli plugins remove

EXAMPLES
  $ cli plugins unlink myplugin
```

## `cli plugins update`

Update installed plugins.

```
USAGE
  $ cli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/update.ts)_

## `cli policy create`

Create a payment policy (subscription / milestone / pay-as-you-go)

```
USAGE
  $ cli policy create -g <value> -r <value> -m <value> [-c <value>] [-k <value>] [-a <value>] [--amounts <value>]
    [--auto-renew] [-f daily|weekly|monthly|yearly] [--max-chunk <value>] [--max-per-period <value>] [--max-renewals
    <value>] [--memo <value>] [--period-seconds <value>] [--release-condition <value>] [--timestamps <value>] [-v
    subscription|milestone|pay-as-you-go]

FLAGS
  -a, --amount=<value>             [subscription] Payment amount in smallest token unit
  -c, --connection-url=<value>     [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                   (env: SOLANA_API)
  -f, --frequency=<option>         [default: monthly] [subscription] Payment frequency
                                   <options: daily|weekly|monthly|yearly>
  -g, --gateway=<value>            (required) Payment gateway public key
  -k, --keypath=<value>            [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>         (required) SPL token mint address
  -r, --recipient=<value>          (required) Payment recipient public key
  -v, --variant=<option>           [default: subscription] Policy type variant
                                   <options: subscription|milestone|pay-as-you-go>
      --amounts=<value>            [milestone] Comma-separated milestone amounts (up to 4)
      --[no-]auto-renew            [subscription] Auto-renew
      --max-chunk=<value>          [pay-as-you-go] Max amount per chunk
      --max-per-period=<value>     [pay-as-you-go] Max amount per period
      --max-renewals=<value>       [subscription] Maximum number of renewals
      --memo=<value>               Memo to attach to the policy (max 64 chars)
      --period-seconds=<value>     [pay-as-you-go] Period length in seconds
      --release-condition=<value>  [default: 1] [milestone] Release bitmap: bit0=due-date, bit1=gateway, bit2=owner,
                                   bit3=recipient
      --timestamps=<value>         [milestone] Comma-separated milestone due timestamps (unix seconds)

DESCRIPTION
  Create a payment policy (subscription / milestone / pay-as-you-go)

EXAMPLES
  $ cli policy create --variant subscription -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000

  $ cli policy create --variant milestone -m <MINT> -r <RECIPIENT> -g <GATEWAY> --amounts 1000,2000 --timestamps 1700000000,1800000000 --release-condition 1

  $ cli policy create --variant pay-as-you-go -m <MINT> -r <RECIPIENT> -g <GATEWAY> --max-per-period 1000000 --max-chunk 100000 --period-seconds 86400
```

_See code: [src/commands/policy/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/policy/create.ts)_

## `cli policy list`

List payment policies for a user payment account

```
USAGE
  $ cli policy list -u <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -u, --user-payment=<value>    (required) User payment account public key to list policies for

DESCRIPTION
  List payment policies for a user payment account

EXAMPLES
  $ cli policy list --user-payment <USER_PAYMENT_PUBKEY>

  $ cli policy list -u <USER_PAYMENT_PUBKEY>
```

_See code: [src/commands/policy/list.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/policy/list.ts)_

## `cli policy status`

Change a payment policy status (pause / resume / delete)

```
USAGE
  $ cli policy status -p <value> -s paused|active|deleted -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint address
  -p, --policy-id=<value>       (required) Policy ID number
  -s, --status=<option>         (required) New status
                                <options: paused|active|deleted>

DESCRIPTION
  Change a payment policy status (pause / resume / delete)

EXAMPLES
  $ cli policy status -m <MINT> -p 1 --status paused

  $ cli policy status -m <MINT> -p 1 --status active

  $ cli policy status -m <MINT> -p 1 --status deleted
```

_See code: [src/commands/policy/status.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/policy/status.ts)_

## `cli program initialize`

Initialize the Tributary program

```
USAGE
  $ cli program initialize [-c <value>] [-k <value>] [-a <value>]

FLAGS
  -a, --admin=<value>           Admin public key for program initialization (defaults to wallet public key)
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Initialize the Tributary program

EXAMPLES
  $ cli program initialize

  $ cli program initialize --admin <PUBKEY>
```

_See code: [src/commands/program/initialize.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/program/initialize.ts)_

## `cli referral chain`

Show referral chain for an owner

```
USAGE
  $ cli referral chain -g <value> -o <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -g, --gateway=<value>         (required) Gateway public key
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -o, --owner=<value>           (required) Owner public key to trace chain for

DESCRIPTION
  Show referral chain for an owner

EXAMPLES
  $ cli referral chain --gateway GATEWAY_PUBKEY --owner OWNER_PUBKEY

  $ cli referral chain -g GATEWAY_PUBKEY -o OWNER_PUBKEY
```

_See code: [src/commands/referral/chain.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/referral/chain.ts)_

## `cli referral create`

Create a referral account

```
USAGE
  $ cli referral create -g <value> [-c <value>] [-k <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --code=<value>            Referral code (auto-generated if not provided)
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -g, --gateway=<value>         (required) Gateway public key
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -r, --referrer=<value>        Referrer public key (for nested referrals)

DESCRIPTION
  Create a referral account

EXAMPLES
  $ cli referral create --gateway GATEWAY_PUBKEY

  $ cli referral create --gateway GATEWAY_PUBKEY --code MYCODE

  $ cli referral create -g GATEWAY_PUBKEY -c MYCODE -r REFERRER_PUBKEY
```

_See code: [src/commands/referral/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/referral/create.ts)_

## `cli referral show`

Show referral account by code

```
USAGE
  $ cli referral show -c <value> -g <value> [-c <value>] [-k <value>]

FLAGS
  -c, --code=<value>            (required) Referral code to look up
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -g, --gateway=<value>         (required) Gateway public key
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Show referral account by code

EXAMPLES
  $ cli referral show --gateway GATEWAY_PUBKEY --code MYCODE

  $ cli referral show -g GATEWAY_PUBKEY -c MYCODE
```

_See code: [src/commands/referral/show.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/referral/show.ts)_

## `cli referral show-owner`

Show referral account by owner

```
USAGE
  $ cli referral show-owner -g <value> -o <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -g, --gateway=<value>         (required) Gateway public key
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -o, --owner=<value>           (required) Owner public key to look up

DESCRIPTION
  Show referral account by owner

EXAMPLES
  $ cli referral show-owner --gateway GATEWAY_PUBKEY --owner OWNER_PUBKEY

  $ cli referral show-owner -g GATEWAY_PUBKEY -o OWNER_PUBKEY
```

_See code: [src/commands/referral/show-owner.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/referral/show-owner.ts)_

## `cli user create`

Create a user payment account for a specific token mint

```
USAGE
  $ cli user create -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) SPL token mint address for the user payment account

DESCRIPTION
  Create a user payment account for a specific token mint

EXAMPLES
  $ cli user create --token-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

  $ cli user create -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

_See code: [src/commands/user/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/user/create.ts)_

## `cli user delete`

Delete a user payment account (closes the account, refunds rent to owner)

```
USAGE
  $ cli user delete -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --mint=<value>            (required) SPL token mint address of the user payment account to delete

DESCRIPTION
  Delete a user payment account (closes the account, refunds rent to owner)

EXAMPLES
  $ cli user delete --mint <MINT>

  $ cli user delete -m <MINT>
```

_See code: [src/commands/user/delete.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/user/delete.ts)_

## `cli user list`

List all user payment accounts

```
USAGE
  $ cli user list [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  List all user payment accounts

EXAMPLES
  $ cli user list
```

_See code: [src/commands/user/list.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/user/list.ts)_

## `cli user show`

Show details of a user payment account

```
USAGE
  $ cli user show -u <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -u, --user-payment=<value>    (required) User payment account public key to inspect

DESCRIPTION
  Show details of a user payment account

EXAMPLES
  $ cli user show --user-payment 9ZNTfG4Ny3g5HmM2qSyoF8eJ7dQeK61dnY6gMqDdKBgE

  $ cli user show -u 9ZNTfG4Ny3g5HmM2qSyoF8eJ7dQeK61dnY6gMqDdKBgE
```

_See code: [src/commands/user/show.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/user/show.ts)_

## `cli wallet address`

Display the public key of the current wallet

```
USAGE
  $ cli wallet address [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Display the public key of the current wallet

EXAMPLES
  $ cli wallet address

  $ cli wallet address --keypath ./my-wallet.json
```

_See code: [src/commands/wallet/address.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/wallet/address.ts)_

## `cli wallet balance`

Display SOL and optional SPL token balances for the current wallet

```
USAGE
  $ cli wallet balance [-c <value>] [-k <value>] [-m <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      SPL token mint address to check balance for

DESCRIPTION
  Display SOL and optional SPL token balances for the current wallet

EXAMPLES
  $ cli wallet balance

  $ cli wallet balance --token-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

_See code: [src/commands/wallet/balance.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/wallet/balance.ts)_

## `cli wallet create`

Generate a new Solana keypair and save to file

```
USAGE
  $ cli wallet create [-c <value>] [-k <value>] [-o <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -o, --output=<value>          [default: keypair.json] Output file path for the new keypair

DESCRIPTION
  Generate a new Solana keypair and save to file

EXAMPLES
  $ cli wallet create

  $ cli wallet create --output my-wallet.json
```

_See code: [src/commands/wallet/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/wallet/create.ts)_

## `cli wallet import PATH`

Import an existing Solana keypair from a JSON file

```
USAGE
  $ cli wallet import PATH [-c <value>] [-k <value>]

ARGUMENTS
  PATH  Path to keypair JSON file to import

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Import an existing Solana keypair from a JSON file

EXAMPLES
  $ cli wallet import ./my-wallet.json
```

_See code: [src/commands/wallet/import.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/wallet/import.ts)_
<!-- commandsstop -->
2026-07-07: v2 release
