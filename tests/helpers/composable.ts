/**
 * Shared test fixtures (G-5/G-6, review 2026-07-06).
 *
 * Centralises the admin keypair that was previously inlined as a 64-byte
 * literal in 5 test files, plus the composable-policy spec helpers
 * (`DISABLED_SPEC`, `DISABLED_INIT`, `programCallSpec`, `validationInit`,
 * `defaultByteRangeChecks`, `defaultForwardConfig`) that were duplicated
 * across 6 files. Importing from here keeps the test surface in lockstep
 * and makes future renames a one-file change.
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import * as fs from "fs";
import * as path from "path";

/**
 * Admin keypair for Surfpool integration tests. TEST ONLY — has no
 * authority on any public cluster. Loaded once from
 * `tests/fixtures/test-keys.json` so the literal bytes live in exactly one
 * place.
 */
export const ADMIN_KEYPAIR: number[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "fixtures", "test-keys.json"),
    "utf-8"
  )
).adminSecretKey;

export function loadAdminKeypair(): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
}

// ── Composable ValidationSpec / ValidationInit helpers ───────────────────

export const DISABLED_SPEC = { disabled: {} } as any;

export const DISABLED_INIT = {
  numPinnedAccounts: 0,
  pinnedAccounts: [PublicKey.default, PublicKey.default],
  validationData: Buffer.alloc(0),
} as any;

export function programCallSpec(programId: PublicKey): any {
  return { programCall: { programId } };
}

export function validationInit(pinnedAccounts: PublicKey[], data: Buffer): any {
  const padded = [PublicKey.default, PublicKey.default];
  for (let i = 0; i < pinnedAccounts.length && i < 2; i++) {
    padded[i] = pinnedAccounts[i];
  }
  return {
    numPinnedAccounts: pinnedAccounts.length,
    pinnedAccounts: padded,
    validationData: data,
  } as any;
}

// ── Forward-config helpers ───────────────────────────────────────────────
//
// `defaultByteRangeChecks` is shared (identical across files).
// `defaultForwardConfig` is NOT extracted: each test file uses a slightly
// different shape (different programId, different numPinnedAccounts, different
// caller signature). Keeping it local avoids a leaky abstraction.

export function defaultByteRangeChecks(): any[] {
  return [
    { offset: 0, length: 8, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
  ];
}
