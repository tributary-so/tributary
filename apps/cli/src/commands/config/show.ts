import {BaseCommand} from '../../lib/base-command.js'

export default class ConfigShow extends BaseCommand {
  static description = 'Show the global ProgramConfig (read-only; emergency_pause has no on-chain setter)'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> config show -c https://api.mainnet-beta.solana.com',
  ]
  static flags = {...BaseCommand.baseFlags}

  public async run(): Promise<void> {
    const sdk = await this.getReadOnlySDK()
    const configPda = sdk.getConfigPda()
    const config = await sdk.getProgramConfig(configPda.address)
    if (!config) this.error('Program config account not found. Is the program initialized?')

    this.output({
      command: 'config show',
      config: {
        address: configPda.address.toBase58(),
        admin: config.admin.toBase58(),
        bump: config.bump,
        emergencyPause: config.emergencyPause,
        feeRecipient: config.feeRecipient.toBase58(),
        protocolShareBps: config.protocolShareBps,
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
