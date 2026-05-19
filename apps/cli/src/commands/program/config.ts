import {ReadOnlyCommand} from '../../lib/base-command.js'

export default class ProgramConfig extends ReadOnlyCommand {
  static description = 'Get program config PDA address'
static examples = ['<%= config.bin %> program config']
static flags = {
    ...ReadOnlyCommand.baseFlags,
  }

  public async run(): Promise<void> {
    const sdk = await this.getSDK()
    const pda = sdk.getConfigPda()

    this.output({
      command: 'program config',
      pda: {
        address: pda.address.toString(),
        bump: pda.bump,
      },
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
