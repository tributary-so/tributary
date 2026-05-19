import {Flags} from '@oclif/core'
import {Connection} from '@solana/web3.js'

import {WalletlessCommand} from '../../lib/base-command.js'
import {readKeypairFromFile} from '../../lib/utils.js'

export default class WalletBalance extends WalletlessCommand {
  static description = 'Display SOL and optional SPL token balances for the current wallet'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --token-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ]
  static flags = {
    ...WalletlessCommand.baseFlags,
    'token-mint': Flags.string({
      char: 'm',
      description: 'SPL token mint address to check balance for',
    }),
  }

  public async run(): Promise<void> {
    await this.parse(WalletBalance)
    const connection = new Connection(this.connectionUrl)
    const keypair = readKeypairFromFile(this.keypath)
    const lamports = await connection.getBalance(keypair.publicKey)

    this.output({
      balance: {
        lamports,
        sol: lamports / 1e9,
      },
      command: 'wallet:balance',
      publicKey: keypair.publicKey.toBase58(),
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
