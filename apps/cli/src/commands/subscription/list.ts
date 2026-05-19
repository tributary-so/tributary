import {Flags} from '@oclif/core'

import {ReadOnlyCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class SubscriptionList extends ReadOnlyCommand {
  static description = 'List payment policies'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --owner <OWNER_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -o <OWNER_PUBKEY>',
  ]
  static flags = {
    ...ReadOnlyCommand.baseFlags,
    owner: Flags.string({
      char: 'o',
      description: 'Filter by owner public key',
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SubscriptionList)

    const sdk = await this.getSDK()

    if (flags.owner) {
      const owner = parsePublicKey(flags.owner)
      if (!owner) this.error('Invalid owner public key')

      const userPayments = await sdk.getAllUserPaymentsByOwner(owner)
      const results = await Promise.all(
        userPayments.map(async (up) => {
          const policies = await sdk.getPaymentPoliciesByUserPayment(up.publicKey)
          return {
            policies: policies.map((p) => ({
              policyId: p.account.policyId,
              status: Object.keys(p.account.status)[0],
            })),
            userPayment: up.publicKey.toString(),
          }
        }),
      )

      this.output({
        command: 'subscription list',
        filter: {owner: owner.toString()},
        success: true,
        timestamp: new Date().toISOString(),
        userPayments: results,
        userPaymentsCount: userPayments.length,
      })
    } else {
      const policies = await sdk.getAllPaymentPolicies()
      this.output({
        command: 'subscription list',
        count: policies.length,
        policies: policies.map((p) => ({
          publicKey: p.publicKey.toString(),
          status: Object.keys(p.account.status)[0],
        })),
        success: true,
        timestamp: new Date().toISOString(),
      })
    }
  }
}
