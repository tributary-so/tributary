import {Flags} from '@oclif/core'

import {ReadOnlyCommand} from '../../lib/base-command.js'
import {parsePublicKey} from '../../lib/utils.js'

export default class SubscriptionList extends ReadOnlyCommand {
  static description = 'List payment policies for a user payment account'
  static examples = [
    '<%= config.bin %> <%= command.id %> --user-payment <USER_PAYMENT_PUBKEY>',
    '<%= config.bin %> <%= command.id %> -u <USER_PAYMENT_PUBKEY>',
  ]
  static flags = {
    ...ReadOnlyCommand.baseFlags,
    'user-payment': Flags.string({
      char: 'u',
      description: 'User payment account public key to list policies for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SubscriptionList)

    const userPayment = parsePublicKey(flags['user-payment'])
    if (!userPayment) this.error('Invalid user payment public key')

    const sdk = await this.getSDK()

    const userPaymentAccount = await sdk.getUserPayment(userPayment)
    const policies = await sdk.getPaymentPoliciesByUserPayment(userPayment)

    this.output({
      command: 'subscription list',
      filter: {userPayment: userPayment.toString()},
      policies: policies.map((p) => ({
        policyId: p.account.policyId,
        publicKey: p.publicKey.toString(),
        status: Object.keys(p.account.status)[0],
      })),
      policiesCount: policies.length,
      success: true,
      timestamp: new Date().toISOString(),
      userPayment: userPaymentAccount
        ? {
            activePoliciesCount: userPaymentAccount.activePoliciesCount,
            createdPoliciesCount: userPaymentAccount.createdPoliciesCount,
            isActive: userPaymentAccount.isActive,
            owner: userPaymentAccount.owner.toString(),
            tokenMint: userPaymentAccount.tokenMint.toString(),
          }
        : null,
    })
  }
}
