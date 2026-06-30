import {BaseCommand} from '../../lib/base-command.js'

export default class PdaConfig extends BaseCommand {
  static description = 'Get program config PDA address'
  static examples = ['<%= config.bin %> <%= command.id %>']
  static flags = {
    ...BaseCommand.baseFlags,
  }

  public async run(): Promise<void> {
    const sdk = await this.getReadOnlySDK()
    const pda = sdk.getConfigPda()

    this.output({
      command: 'pda config',
      pda: {
        address: pda.address.toString(),
        bump: pda.bump,
        type: 'config',
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
