---
# tributary-k94z
title: Implement createOreTopUpForward + oreTopUpForwardConfig
status: todo
type: task
created_at: 2026-07-23T08:04:11Z
updated_at: 2026-07-23T08:04:11Z
parent: tributary-ljah
---

packages/forward-builders/src/ore-topup.ts per milestone tributary-ew9s HANDOFF §2: fire-time builder (instructionData = 1-byte disc + le64(face); forwardAccounts pubkey/isWritable only, mirroring meteora-dlmm.ts) + setup-time ForwardConfig (programId, offset-0 dataCheck, pinned automation PDA, inputMint=NATIVE_MINT, outputMint=PublicKey.default, forwardFlags=0). Add ORE_PROGRAM_PUBKEY + ORE_TOPUP_DISCRIMINATOR to constants.ts; export from index.ts. Account order comes from the E1 design doc.
