# @tributary-so/cli

Tributary CLI — manage recurring payment policies, gateways, and composable pull payments on Solana.

## Usage

```sh
$ npm install -g @tributary-so/cli
$ tributary COMMAND
```

## Commands

<!-- commands -->
* [`cli gateway create`](#cli-gateway-create)
* [`cli gateway delete`](#cli-gateway-delete)
* [`cli gateway feature-flags`](#cli-gateway-feature-flags)
* [`cli gateway fee-bps`](#cli-gateway-fee-bps)
* [`cli gateway fee-recipient`](#cli-gateway-fee-recipient)
* [`cli gateway list`](#cli-gateway-list)
* [`cli gateway show`](#cli-gateway-show)
* [`cli gateway signer`](#cli-gateway-signer)
* [`cli help [COMMAND]`](#cli-help-command)
* [`cli payments execute`](#cli-payments-execute)
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
* [`cli program initialize`](#cli-program-initialize)
* [`cli referral chain`](#cli-referral-chain)
* [`cli referral create`](#cli-referral-create)
* [`cli referral show`](#cli-referral-show)
* [`cli referral show-owner`](#cli-referral-show-owner)
* [`cli state`](#cli-state)
* [`cli subscription create`](#cli-subscription-create)
* [`cli subscription delete`](#cli-subscription-delete)
* [`cli subscription list`](#cli-subscription-list)
* [`cli subscription pause`](#cli-subscription-pause)
* [`cli subscription resume`](#cli-subscription-resume)
* [`cli user create`](#cli-user-create)
* [`cli user list`](#cli-user-list)
* [`cli user show`](#cli-user-show)
* [`cli wallet address`](#cli-wallet-address)
* [`cli wallet balance`](#cli-wallet-balance)
* [`cli wallet create`](#cli-wallet-create)
* [`cli wallet import PATH`](#cli-wallet-import-path)

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

## `cli payments execute`

Execute a recurring payment

```
USAGE
  $ cli payments execute [-c <value>] [-k <value>] [-p <value> | -u <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -p, --policy=<value>          Payment policy public key to execute
  -u, --user-payment=<value>    User payment account public key (alternative to policy)

DESCRIPTION
  Execute a recurring payment

EXAMPLES
  $ cli payments execute --policy <POLICY_PUBKEY>

  $ cli payments execute -p <POLICY_PUBKEY>

  $ cli payments execute --user-payment <USER_PAYMENT_PUBKEY>

  $ cli payments execute -u <USER_PAYMENT_PUBKEY>
```

_See code: [src/commands/payments/execute.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/payments/execute.ts)_

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

## `cli state`

Dump the global ProgramConfig state account

```
USAGE
  $ cli state [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)

DESCRIPTION
  Dump the global ProgramConfig state account

EXAMPLES
  $ cli state

  $ cli state -c https://api.mainnet-beta.solana.com
```

_See code: [src/commands/state.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/state.ts)_

## `cli subscription create`

Create a subscription payment policy

```
USAGE
  $ cli subscription create -a <value> -g <value> -r <value> -m <value> [-c <value>] [-k <value>] [--auto-renew] [-f
    daily|weekly|monthly|yearly] [--max-renewals <value>] [--memo <value>]

FLAGS
  -a, --amount=<value>          (required) Payment amount in smallest token unit
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -f, --frequency=<option>      [default: monthly] Payment frequency
                                <options: daily|weekly|monthly|yearly>
  -g, --gateway=<value>         (required) Payment gateway public key
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) SPL token mint address
  -r, --recipient=<value>       (required) Payment recipient public key
      --[no-]auto-renew         Auto-renew the subscription
      --max-renewals=<value>    Maximum number of renewals
      --memo=<value>            Memo to attach to the policy (max 64 chars)

DESCRIPTION
  Create a subscription payment policy

EXAMPLES
  $ cli subscription create -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 1000000

  $ cli subscription create -m <MINT> -r <RECIPIENT> -g <GATEWAY> -a 500000 -f weekly --no-auto-renew --max-renewals 12 --memo "Netflix"
```

_See code: [src/commands/subscription/create.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/subscription/create.ts)_

## `cli subscription delete`

Delete a payment policy

```
USAGE
  $ cli subscription delete -p <value> -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint address
  -p, --policy-id=<value>       (required) Policy ID number

DESCRIPTION
  Delete a payment policy

EXAMPLES
  $ cli subscription delete -m <MINT> -p 1

  $ cli subscription delete --token-mint <MINT> --policy-id 3
```

_See code: [src/commands/subscription/delete.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/subscription/delete.ts)_

## `cli subscription list`

List payment policies for a user payment account

```
USAGE
  $ cli subscription list -u <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -u, --user-payment=<value>    (required) User payment account public key to list policies for

DESCRIPTION
  List payment policies for a user payment account

EXAMPLES
  $ cli subscription list --user-payment <USER_PAYMENT_PUBKEY>

  $ cli subscription list -u <USER_PAYMENT_PUBKEY>
```

_See code: [src/commands/subscription/list.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/subscription/list.ts)_

## `cli subscription pause`

Pause a payment policy

```
USAGE
  $ cli subscription pause -p <value> -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint address
  -p, --policy-id=<value>       (required) Policy ID number

DESCRIPTION
  Pause a payment policy

EXAMPLES
  $ cli subscription pause -m <MINT> -p 1
```

_See code: [src/commands/subscription/pause.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/subscription/pause.ts)_

## `cli subscription resume`

Resume a paused payment policy

```
USAGE
  $ cli subscription resume -p <value> -m <value> [-c <value>] [-k <value>]

FLAGS
  -c, --connection-url=<value>  [default: https://api.devnet.solana.com, env: SOLANA_API] Solana RPC connection URL
                                (env: SOLANA_API)
  -k, --keypath=<value>         [default: keypair.json, env: KEY_PATH] Path to keypair file (env: KEY_PATH)
  -m, --token-mint=<value>      (required) Token mint address
  -p, --policy-id=<value>       (required) Policy ID number

DESCRIPTION
  Resume a paused payment policy

EXAMPLES
  $ cli subscription resume -m <MINT> -p 1
```

_See code: [src/commands/subscription/resume.ts](https://github.com/tributary-so/tributary/blob/v1.8.0/src/commands/subscription/resume.ts)_

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
