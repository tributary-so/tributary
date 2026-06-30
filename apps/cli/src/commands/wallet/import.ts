import {Args} from '@oclif/core'
import {resolve} from 'node:path'

import {BaseCommand} from '../../lib/base-command.js'
import {readKeypairFromFile} from '../../lib/utils.js'

export default class WalletImport extends BaseCommand {
  static args = {
    path: Args.string({
      description: 'Path to keypair JSON file to import',
      required: true,
    }),
  }
  static description = 'Import an existing Solana keypair from a JSON file'
  static examples = ['<%= config.bin %> <%= command.id %> ./my-wallet.json']

  public async run(): Promise<void> {
    const {args} = await this.parse(WalletImport)
    const resolvedPath = resolve(args.path)
    const keypair = readKeypairFromFile(resolvedPath)

    this.output({
      command: 'wallet:import',
      path: resolvedPath,
      publicKey: keypair.publicKey.toBase58(),
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
