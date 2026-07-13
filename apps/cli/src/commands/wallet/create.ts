import {Flags} from '@oclif/core'
import {Keypair} from '@solana/web3.js'
import * as fs from 'node:fs'
import {resolve} from 'node:path'

import {BaseCommand} from '../../lib/base-command.js'

export default class WalletCreate extends BaseCommand {
  static description = 'Generate a new Solana keypair and save to file'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output my-wallet.json',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
    output: Flags.string({
      char: 'o',
      default: 'keypair.json',
      description: 'Output file path for the new keypair',
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(WalletCreate)
    const keypair = Keypair.generate()
    const outPath = resolve(flags.output)

    fs.writeFileSync(outPath, JSON.stringify([...keypair.secretKey]))

    this.output({
      command: 'wallet:create',
      path: outPath,
      publicKey: keypair.publicKey.toBase58(),
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
