---
# tributary-r6kz
title: balanceCheck + site variants (intermediateOutput/Input, recipientOutput)
status: todo
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T10:34:51Z
parent: tributary-eznl
---

balanceCheck({ target, threshold, op }) wraps lighthouse.tokenAccount(target).amount(threshold, op).build() → lighthouseValidation. Site variants derive ATA via getAssociatedTokenAddressSync (pure sync) then delegate to balanceCheck: intermediateOutputBalanceCheck({ composablePolicyPda, outputMint }), intermediateInputBalanceCheck({ composablePolicyPda, inputMint }), recipientOutputBalanceCheck({ recipient, outputMint }). All in packages/sdk/src/.
