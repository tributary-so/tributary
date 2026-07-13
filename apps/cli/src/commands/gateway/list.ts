import {BaseCommand} from '../../lib/base-command.js'

export default class GatewayList extends BaseCommand {
  static description = 'List all payment gateways'
  static examples = ['<%= config.bin %> <%= command.id %>']
  static flags = {
    ...BaseCommand.baseFlags,
  }

  public async run(): Promise<void> {
    const sdk = await this.getReadOnlySDK()
    const gateways = await sdk.getAllPaymentGateway()

    this.output({
      command: 'gateway list',
      count: gateways.length,
      gateways: gateways.map((gw) => ({
        active: gw.account.isActive,
        authority: gw.account.authority.toString(),
        bump: gw.account.bump,
        createdAt: gw.account.createdAt.toString(),
        customProtocolShareBps: gw.account.customProtocolShareBps,
        featureFlags: gw.account.featureFlags,
        feeBps: gw.account.gatewayFeeBps,
        feeRecipient: gw.account.feeRecipient.toString(),
        name: Buffer.from(gw.account.name).toString('utf8').replaceAll('\0', ''),
        publicKey: gw.publicKey.toString(),
        referralAllocationBps: gw.account.referralAllocationBps,
        referralTiersBps: [...gw.account.referralTiersBps],
        schedulerShareBps: gw.account.schedulerShareBps,
        signer: gw.account.signer.toString(),
        url: Buffer.from(gw.account.url).toString('utf8').replaceAll('\0', ''),
      })),
      success: true,
      timestamp: new Date().toISOString(),
    })
  }
}
