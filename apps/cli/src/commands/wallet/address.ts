import {BaseCommand} from '../../lib/base-command.js'
import {readKeypairFromFile} from '../../lib/utils.js'

export default class WalletAddress extends BaseCommand {
  static description = 'Display the public key of the current wallet'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --keypath ./my-wallet.json',
  ]

  public async run(): Promise<void> {
    await this.parse(WalletAddress)
    const keypair = readKeypairFromFile(this.keypath)

    this.output({
      command: 'wallet:address',
      publicKey: keypair.publicKey.toBase58(),
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
