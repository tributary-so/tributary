import {BaseCommand} from '../lib/base-command.js'

export default class State extends BaseCommand {
  static description = 'Dump the global ProgramConfig state account'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> state -c https://api.mainnet-beta.solana.com',
  ]
  static flags = {
    ...BaseCommand.baseFlags,
  }

  public async run(): Promise<void> {
    const sdk = await this.getReadOnlySDK()
    const configPda = sdk.getConfigPda()
    const config = await sdk.getProgramConfig(configPda.address)

    if (!config) {
      this.error('Program config account not found. Is the program initialized?')
      return
    }

    this.output({
      command: 'state',
      config: {
        address: configPda.address.toBase58(),
        admin: config.admin.toBase58(),
        bump: config.bump,
        emergencyPause: config.emergencyPause,
        feeRecipient: config.feeRecipient.toBase58(),
        protocolShareBps: config.protocolShareBps,
      },
      pda: {
        address: configPda.address.toBase58(),
        bump: configPda.bump,
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
