import {ReadOnlyCommand} from '../../lib/base-command.js'
import {formatDate} from '../../lib/utils.js'

export default class UserList extends ReadOnlyCommand {
  static description = 'List all user payment accounts'
static examples = ['<%= config.bin %> user list']
static flags = {
    ...ReadOnlyCommand.baseFlags,
  }

  public async run(): Promise<void> {
    const sdk = await this.getSDK()
    const userPayments = await sdk.getAllUserPayments()

    const users = userPayments.map(({account, publicKey}) => ({
      activePolicies: account.activePoliciesCount,
      owner: account.owner.toBase58(),
      publicKey: publicKey.toBase58(),
      totalPolicies: account.createdPoliciesCount,
    }))

    this.output({
      command: 'user list',
      count: users.length,
      success: true,
      timestamp: formatDate(Math.floor(Date.now() / 1000)),
      users,
    })
  }
}
