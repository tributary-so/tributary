---
# tributary-y48b
title: 'L-03: No Upgrade Authority Management'
status: todo
type: task
priority: low
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# L-03: No Upgrade Authority Management

| Field          | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| **Severity**   | Low (Operational)                                          |
| **Type**       | Centralization / Operational Risk                          |
| **Status**     | Open                                                       |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`              |
| **Files**      | `Makefile`, `Anchor.toml`, `programs/tributary/src/lib.rs` |

---

## Description

The Tributary program has **no documented upgrade authority management strategy**. The deployment configuration in `Makefile:1` references a single deployer keypair:

```makefile
DEPLOY_KEY_PATH := ~/.config/solana/ADmSd9uYBRbLGa9rN1NtFv5LXtwLPdtVwGT5xhAYY4xZ.json
```

This keypair is used for all mainnet operations — building, deploying buffer, writing the program, publishing IDL, and submitting verifiable builds. There is no evidence of:

- Transfer of upgrade authority to a multisig (e.g., Squads Protocol, Realms, or Goki).
- Setting the program to immutable (`--final`) after deployment.
- Any deployment playbook or runbook documenting the upgrade authority state.

The program itself has **no on-chain mechanism to manage or verify its own upgrade authority**. The `ProgramConfig` admin key controls protocol-level operations (fee changes, emergency pause) but is entirely orthogonal to the Solana BPF loader's upgrade authority — a compromised upgrade authority can replace the entire program binary regardless of who the `ProgramConfig.admin` is.

---

## Current State

```bash
$ solana program show TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ --url mainnet-beta

Program ID: TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: <PROGRAM_DATA_ADDRESS>
Authority: <CURRENT_UPGRADE_AUTHORITY>   # <-- likely the deployer keypair
Last Deployed In Slot: <SLOT>
```

If `Authority` shows the raw deployer pubkey (not a multisig PDA), the program's upgrade path is protected by a single private key.

---

## Risk Analysis

A compromised upgrade authority allows an attacker to:

1. **Replace the entire program binary** with arbitrary logic — bypassing all on-chain admin checks, fee limits, and pause mechanisms.
2. **Extract all delegated tokens** — the `PaymentsDelegate` PDA has delegated token authority over user accounts. A malicious upgrade could drain every user's delegated token balance in a single transaction.
3. **Backdoor the program** — subtle modifications (e.g., adding a hidden admin key, skimming fees) that are invisible to users who don't verify the on-chain binary hash.
4. **Destroy user trust permanently** — even if detected quickly, the reputational damage from a malicious upgrade on a payments protocol is catastrophic.

### Attack Vector

```
Deployer key compromise
  │
  ├─► Malicious program write-buffer created
  ├─► Buffer deployed with Trojan code
  ├─► solana program deploy --program-id <PID> --buffer <BUFFER>
  │
  └─► Entire program replaced
       ├─► All PaymentDelegate approvals hijacked
       ├─► All UserPayment accounts drained
       └─► Fee recipients redirected
```

### Why This Matters for a Payments Protocol

Tributary manages recurring payment delegations — users have pre-approved token delegations to the `PaymentsDelegate` PDA. These delegations persist across program upgrades. A malicious upgrade can exploit these existing delegations immediately, without any user interaction.

This is not theoretical. In 2022, the Solana ecosystem saw multiple incidents where compromised deployer keys led to program replacement and fund loss.

---

## Impact

| Impact Category              | Severity | Notes                                              |
| ---------------------------- | -------- | -------------------------------------------------- |
| Full program replacement     | Critical | Binary can be swapped with arbitrary code          |
| Fund theft via delegations   | Critical | Existing `PaymentsDelegate` approvals remain valid |
| Subtle backdoor insertion    | High     | Hard to detect without binary hash verification    |
| User trust destruction       | High     | Unrecoverable for a payments protocol              |
| Likelihood of key compromise | Low      | Depends on deployer key hygiene                    |

**Overall severity: Low** — the finding is rated Low because it requires an external key compromise, not a vulnerability in the program's logic. However, the _impact_ of such a compromise is Critical.

---

## Recommendations

### Step 1: Check Current Upgrade Authority

```bash
solana program show TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ \
  --url mainnet-beta
```

Verify the `Authority` field. If it is a single key (not a multisig), proceed to Step 2 or Step 3.

### Step 2: Transfer Upgrade Authority to a Multisig (Recommended)

Using **Squads Protocol** (recommended for Solana programs):

```bash
# 1. Create a Squads multisig (if not already done)
#    Use the Squads web UI at https://app.squads.so
#    Recommended: 3-of-5 threshold for production programs

# 2. Get the multisig's program authority address (the PDA that will
#    act as upgrade authority)

# 3. Transfer upgrade authority to the multisig
solana program set-upgrade-authority \
  TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ \
  --new-upgrade-authority <MULTISIG_PDA> \
  --url mainnet-beta \
  -k ~/.config/solana/ADmSd9uYBRbLGa9rN1NtFv5LXtwLPdtVwGT5xhAYY4xZ.json

# 4. Verify the transfer
solana program show TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ \
  --url mainnet-beta
# Authority should now show the multisig PDA
```

**Alternative multisig options:**

- **Realms** (Solana's native DAO tool) — good for community-governed programs
- **Goki (Sodium)** — supports timelocks on upgrade transactions

### Step 3: Make the Program Immutable (Alternative)

If no future upgrades are planned:

```bash
# WARNING: This is IRREVERSIBLE. The program can never be upgraded again.
solana program set-upgrade-authority \
  TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ \
  --final \
  --url mainnet-beta \
  -k ~/.config/solana/ADmSd9uYBRbLGa9rN1NtFv5LXtwLPdtVwGT5xhAYY4xZ.json

# Verify
solana program show TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ \
  --url mainnet-beta
# Authority should now show "none"
```

### Step 4: Multisig vs Immutable — Decision Matrix

| Criteria                 | Multisig                             | Immutable                            |
| ------------------------ | ------------------------------------ | ------------------------------------ |
| **Future upgrades**      | Possible with M-of-N approval        | Impossible                           |
| **Bug fix capability**   | Can patch critical bugs              | Cannot patch — must redeploy new PID |
| **Security model**       | M-of-N key holders must be trusted   | Trustless after deployment           |
| **Operational overhead** | Requires multisig coordination       | Zero — set and forget                |
| **Emergency response**   | Can upgrade to fix exploits          | Cannot respond on-chain              |
| **User confidence**      | High (auditable multisig governance) | Maximum (code is permanent)          |

**Recommendation for Tributary:** Use a **3-of-5 Squads multisig** during active development, then transition to **immutable** once the program reaches maturity and all audits are complete. A two-phase approach gives the best balance of security and flexibility.

### Phase Transition Plan

```
Phase 1: Active Development (Current)
├── Upgrade authority → 3-of-5 Squads multisig
├── Multisig members: core team + trusted advisors
└── Timelock: consider 24h delay on upgrades

Phase 2: Production Maturity (Post-audit, stable for 3+ months)
├── Final audit completed, no findings pending
├── All planned features shipped and battle-tested
└── Upgrade authority → set --final (immutable)

```

---

## Deployment Checklist

Pre-mainnet deployment checklist for upgrade authority management:

```
╔══════════════════════════════════════════════════════════════════╗
║              UPGRADE AUTHORITY DEPLOYMENT CHECKLIST              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  PRE-DEPLOYMENT                                                  ║
║  ─────────────────                                               ║
║  [ ] Generate deploy keypair on air-gapped machine               ║
║  [ ] Store deploy key in hardware wallet or HSM                  ║
║  [ ] Fund deploy key with sufficient SOL for deployment          ║
║  [ ] Verify program binary hash matches audited source           ║
║       $ solana-verify get-executable-hash ./target/deploy/       ║
║         tributary.so                                             ║
║                                                                  ║
║  DEPLOYMENT                                                      ║
║  ──────────                                                      ║
║  [ ] Deploy to mainnet using buffer deployment method             ║
║       $ make mainnet_deploy_buffer                               ║
║  [ ] Immediately call initialize (atomic bundle preferred)       ║
║  [ ] Verify program deployed correctly:                          ║
║       $ solana program show <PID> --url mainnet-beta             ║
║  [ ] Verify on-chain binary hash:                                ║
║       $ solana-verify get-program-hash -u mainnet-beta <PID>     ║
║                                                                  ║
║  POST-DEPLOYMENT (IMMEDIATE — within 1 hour)                    ║
║  ────────────────────────────────────────                        ║
║  [ ] Check current upgrade authority:                            ║
║       $ solana program show <PID> --url mainnet-beta             ║
║  [ ] Transfer upgrade authority to multisig OR set immutable:    ║
║       $ solana program set-upgrade-authority <PID> \             ║
║         --new-upgrade-authority <MULTISIG> --url mainnet-beta    ║
║       OR                                                         ║
║       $ solana program set-upgrade-authority <PID> \             ║
║         --final --url mainnet-beta                               ║
║  [ ] Verify authority transfer succeeded                         ║
║  [ ] Delete deploy keypair from disk:                            ║
║       $ shred -u ~/.config/solana/ADmSd9uYBRbLGa9r...json       ║
║                                                                  ║
║  ONGOING                                                         ║
║  ────────                                                        ║
║  [ ] Monitor program authority periodically                       ║
║  [ ] If multisig: review multisig membership quarterly           ║
║  [ ] If mutable: require timelock for all upgrades               ║
║  [ ] Document all upgrade transactions in ops log                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Makefile Additions

Consider adding these targets to `Makefile` for upgrade authority management:

```makefile
# Upgrade Authority Management ######################################

check-authority:
	solana program show $(PROGRAM_ID) --url $(SOLANA_API)

transfer-authority:
	@read -p "New upgrade authority pubkey: " NEW_AUTH && \
	solana program set-upgrade-authority $(PROGRAM_ID) \
		--new-upgrade-authority $$NEW_AUTH \
		--url $(SOLANA_API) \
		-k $(DEPLOY_KEY_PATH)

set-immutable:
	@echo "WARNING: This is IRREVERSIBLE. Press Ctrl+C to abort."
	@sleep 5
	solana program set-upgrade-authority $(PROGRAM_ID) \
		--final \
		--url $(SOLANA_API) \
		-k $(DEPLOY_KEY_PATH)
```

---

## References

1. **Solana Documentation — Upgrading a Program**:
   https://solana.com/docs/programs/deploying#upgrading-a-program

2. **Solana Documentation — Making a Program Immutable**:
   https://solana.com/docs/programs/deploying#finalizing-a-program

3. **Squads Protocol — Multisig Program Authority**:
   https://docs.squads.so/squads-protocol/program-authorities

4. **Solana Program Security Best Practices**:
   https://solana.com/docs/programs/security

5. **OtterSec — Solana Program Upgrade Authority Risks**:
   https://osec.io/blog/2022-12-06-solana-program-upgrade-authority

6. **Solana CLI Reference — `solana program`**:
   https://docs.solanalabs.com/cli/programs

7. **Tributary Makefile** (local):
   `Makefile` — deployment configuration using single deployer keypair
