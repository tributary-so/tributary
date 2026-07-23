import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  AddressLookupTableProgram,
  VersionedTransaction,
  TransactionMessage,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

/**
 * Send instructions as a v0 versioned transaction with an Address Lookup
 * Table. Necessary when the combined account count exceeds the legacy
 * 1232-byte limit (e.g. CLMM pools with small tick-spacing → many tick
 * arrays).
 *
 * Flow:
 * 1. Collect all unique non-signer pubkeys from the instructions.
 * 2. Create an ALT + extend it (in separate txs — extend data is heavy).
 * 3. Wait for the slot to advance past the ALT's creation slot (required
 *    for the ALT to be usable).
 * 4. Compile the instructions as a v0 message referencing the ALT.
 * 5. Send + confirm with retry on surfpool channel drops.
 *
 * @param computeUnits — compute budget to request (default 1M for CLMM)
 */
export async function sendV0WithAlt(
  connection: Connection,
  ixs: TransactionInstruction[],
  signers: Keypair[],
  opts?: { computeUnits?: number }
): Promise<string> {
  const payer = signers[0].publicKey;
  const cu = opts?.computeUnits ?? 1_000_000;

  // Compute-budget ix is a sysvar — zero accounts, doesn't affect the ALT.
  const { ComputeBudgetProgram } = await import("@solana/web3.js");
  const allIxs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: cu }),
    ...ixs,
  ];

  // ── 1. Collect all unique non-signer pubkeys + program IDs ──────
  const accountSet = new Set<string>();
  for (const ix of allIxs) {
    accountSet.add(ix.programId.toBase58());
    for (const k of ix.keys) {
      if (!k.isSigner) accountSet.add(k.pubkey.toBase58());
    }
  }
  const altAddresses = [...accountSet].map((s) => new PublicKey(s));

  // ── 2. Create ALT (own tx) ─────────────────────────────────────
  const recentSlot = await connection.getSlot("confirmed");
  const [createIx, altAddress] = AddressLookupTableProgram.createLookupTable({
    authority: payer,
    payer,
    recentSlot,
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(createIx),
    signers,
    { commitment: "processed" }
  );

  // Extend ALT in separate txs (~20 addresses per tx to stay well under
  // the 1232-byte legacy limit — each address = 32 bytes of instruction data).
  for (let i = 0; i < altAddresses.length; i += 20) {
    const extendIx = AddressLookupTableProgram.extendLookupTable({
      lookupTable: altAddress,
      authority: payer,
      payer,
      addresses: altAddresses.slice(i, i + 20),
    });
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(extendIx),
      signers,
      { commitment: "processed" }
    );
  }

  // Fetch the compiled ALT account.
  const altAccount = (await connection.getAddressLookupTable(altAddress)).value;
  if (!altAccount) throw new Error("ALT not found after creation");

  // ── 3. Wait for slot to advance past ALT creation slot ──────────
  // An ALT is only usable in a bank whose slot > recentSlot.
  for (;;) {
    const s = await connection.getSlot("confirmed");
    if (s > recentSlot) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  // ── 4-5. Build + send v0 with retry ─────────────────────────────
  // Surfpool occasionally drops the v0 channel on the first attempt.
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const msg = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions: allIxs,
    }).compileToV0Message([altAccount]);

    const vtx = new VersionedTransaction(msg);
    vtx.sign(signers);

    try {
      const sig = await connection.sendTransaction(vtx, {
        skipPreflight: true,
      });
      const confirmation = await connection.confirmTransaction(
        sig,
        "processed"
      );
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }
      return sig;
    } catch (e: any) {
      lastErr = e;
      // Retry on surfpool channel drops; abort on program errors.
      if (!/disconnected channel|empty.*channel/i.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error("v0 send exhausted retries");
}
