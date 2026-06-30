import {BaseCommand} from '../../lib/base-command.js'

export default class PdaDelegate extends BaseCommand {
  static description = 'Get payments delegate PDA address'
  static examples = ['<%= config.bin %> <%= command.id %>']
  static flags = {
    ...BaseCommand.baseFlags,
  }

  public async run(): Promise<void> {
    const sdk = await this.getReadOnlySDK()
    const pda = sdk.getPaymentsDelegatePda()

    this.output({
      command: 'pda delegate',
      pda: {
        address: pda.address.toString(),
        bump: pda.bump,
        type: 'delegate',
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
