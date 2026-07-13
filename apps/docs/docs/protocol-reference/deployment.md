# Deployment

## Program ID

```
TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
```

- **Same ID on Devnet and Mainnet.** The program is not redeployed with a
  new ID per environment — integrations hard-code the single ID above.
- **No Testnet deployment.** Tributary is not deployed to Solana Testnet.

## RPC endpoints

| Network     | Default RPC                           | Notes                                                                                       |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Mainnet** | `https://api.mainnet-beta.solana.com` | Rate-limited public endpoint; use a private RPC (Helius, Triton, QuickNode) for production. |
| **Devnet**  | `https://api.devnet.solana.com`       | Airdrop only; suitable for integration tests.                                               |
| **Local**   | `http://localhost:8899`               | Surfpool / `solana-test-validator` for unit tests.                                          |

Configure via `solana config set --url <rpc>` or pass `--url` per command.

## Verifying a deployment

```bash
solana program show TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
```

Output should show:

- Program owner: the BPF Upgradeable Loader
- ProgramData address and the **upgrade authority**
- Last deploy / slot

On Mainnet, cross-check the upgrade authority against the published
multi-sig / authority in the repository README before trusting a
deployment.

### Verifying program bytecode

```bash
solana program dump TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ tributary.so --url <rpc>
# compare against the locally built artifact
sha256sum tributary.so target/deploy/tributary.so
```

## Local development

```bash
# Surfpool — the preferred local validator for Tributary tests
surfpool start --legacy-anchor-compatibility --no-tui

# or stock test-validator (does not emulate mainnet state)
solana-test-validator --bpf-program TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ target/deploy/tributary.so
```

Integration tests (`tests/` jest suite, `tests/topup-balance*.test.ts`) are
designed against Surfpool — see the repo's `AGENTS.md` for the exact invocation.

## Network feature notes

- **Token-2022 / extensions**: rejected with `UnsupportedTokenExtension`.
  Use plain SPL token mints for user funds.
- **Compute budget**: composable executions with a forward + validation path
  can exceed the default 200k CU budget. Add a `ComputeBudgetProgram.setComputeUnitLimit`
  instruction (400k–1M) in front of `execute_composable`.
- **Priority fees**: recommended on Mainnet for `execute_*` to avoid landing
  in low-fee queues during congestion.

## Upgrades

Program upgrades are gated by the upgrade authority (see `solana program show`).
Tributary does not use a separate upgrade authority multisig in devnet — on
Mainnet the upgrade authority should be a Squads multisig (verify before
trusting). State migrations are not supported; the program is forward-only
and account layouts are padded to absorb new fields without redeployment.

See [Changelog](changelog.md) for the history of upgrades.
