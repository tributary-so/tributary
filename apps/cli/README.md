cli
=================

Tributary command line tool


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @tributary-so/cli
$ cli COMMAND
running command...
$ cli (--version)
@tributary-so/cli/0.0.0 linux-x64 node-v25.9.0
$ cli --help [COMMAND]
USAGE
  $ cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cli hello PERSON`](#cli-hello-person)
* [`cli hello world`](#cli-hello-world)
* [`cli help [COMMAND]`](#cli-help-command)
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

## `cli hello PERSON`

Say hello

```
USAGE
  $ cli hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ cli hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/tributary-so/tributary/blob/v0.0.0/src/commands/hello/index.ts)_

## `cli hello world`

Say hello world

```
USAGE
  $ cli hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ cli hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/tributary-so/tributary/blob/v0.0.0/src/commands/hello/world.ts)_

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
<!-- commandsstop -->
