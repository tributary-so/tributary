# IDL

The Interface Definition Language (IDL) is the JSON description Anchor
programs emit describing their instructions, accounts, types, and errors.
Tributary's SDK, the React hooks, the CLI manager, and the tests all
consume the same IDL — you should never hand-code instruction layouts.

## Program ID

```
TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
```

Same ID on Devnet and Mainnet. See [Deployment](deployment.md).

## Fetching the on-chain IDL

Anchor stores the IDL in a PDA derived from the program ID. Recover it with
the Anchor CLI:

```bash
# Requires anchor 0.31.x and a Solana RPC in solana config
anchor idl fetch TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
```

Or programmatically:

```typescript
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";

const provider = AnchorProvider.env();
const idl = await Program.fetchIdl(
  "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ",
  provider
);
```

The IDL PDA seeds are `[b"account-storage", program_id]` (Anchor-managed, not
Tributary-defined). If the deployment was made without `--idl`, the on-chain
IDL PDA may be empty — in that case read the local `target/idl/tributary.json`
after building the program, or pull the published IDL from
`@tributary-so/sdk`.

## Instruction families

| Family               | Instructions                                                                                                                                                                                                                             | What changes on-chain                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Config**           | `initialize`                                                                                                                                                                                                                             | Creates `ProgramConfig` singleton (upgrade-authority only). |
| **UserPayment**      | `create_user_payment`, `delete_user_payment`                                                                                                                                                                                             | Per-(owner,mint) delegate account + counters.               |
| **Gateway**          | `create_payment_gateway`, `change_gateway_signer`, `change_gateway_fee_recipient`, `change_gateway_fee_bps`, `update_gateway_referral_settings`, `update_gateway_protocol_fee`, `update_gateway_feature_flags`, `delete_payment_gateway` | Gateway settings, fees, feature flags, referral config.     |
| **PaymentPolicy**    | `create_payment_policy`, `execute_payment`, `change_payment_policy_status`, `delete_payment_policy`                                                                                                                                      | Regular pull-payment lifecycle.                             |
| **ComposablePolicy** | `create_composable_policy`, `execute_composable`, `change_composable_status`, `delete_composable_policy`                                                                                                                                 | Programmable pull-payment lifecycle (validates + forwards). |
| **Referral**         | `create_referral_account`                                                                                                                                                                                                                | Adds a node to a gateway's referral chain.                  |
| **Token**            | `transfer`                                                                                                                                                                                                                               | Helper for moving protocol-owed tokens (admin).             |

### Mutability / signer rules at a glance

- `initialize` — needs the **upgrade authority** as signer (`UnauthorizedInitializer` otherwise).
- All `create_*` — the **owner/authority** signs; a `rent_payer` may be a different account.
- `execute_*` — **permissionless** as long as a valid `gateway.signer` is present. Anyone can submit, but only the gateway's authorized signer triggers the pull.
- `change_*` / `delete_*` — the original `authority` / `owner` signs.

For exact account lists per instruction, `anchor idl fetch` and inspect the
`instructions[].accounts` array.

## Consumers

- **`@tributary-so/sdk`** (`packages/sdk`) — compiled-in IDL, exposes typed
  builders (`getCreateSubscriptionPolicyInstruction`,
  `getCreateComposablePolicyInstruction`, `executeComposable`, …).
- **`@tributary-so/sdk-react`** (`packages/sdk-react`) — React hooks built
  on top of the SDK.
- **CLI manager** (`packages/sdk && pnpm run manager`) — interactive policy
  and gateway management using the same IDL.

When the program is redeployed with new instructions or types, regenerate
the IDL (`anchor build`) and re-publish the SDK so all consumers stay in
sync. The on-chain IDL PDA is updated by `anchor deploy --idl` (or a manual
`idl write` instruction).
