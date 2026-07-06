/**
 * Ponytail self-check: run with `npx tsx src/devnetFallback.ts`.
 * Confirms the override map round-trips and the default-mint picker
 * returns valid base58 for both networks. No framework, no fixtures.
 */

import {
  MINT_OVERRIDES,
  defaultMintForNetwork,
  lookupOverride,
} from "./devnetFallback";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// Every entry in the override map is a valid base58 mint.
for (const [mint, meta] of Object.entries(MINT_OVERRIDES)) {
  assert(BASE58.test(mint), `MINT_OVERRIDES key not base58: ${mint}`);
  assert(meta.symbol.length > 0, `MINT_OVERRIDES[${mint}].symbol empty`);
  assert(
    typeof meta.decimals === "number",
    `MINT_OVERRIDES[${mint}].decimals missing`
  );
}

// Round-trip: lookupOverride returns the same reference.
const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
assert(lookupOverride(usdc)?.symbol === "USDC", "USDC lookup failed");
assert(
  lookupOverride("So11111111111111111111111111111111111111112")?.symbol ===
    "SOL",
  "SOL lookup failed"
);
assert(
  lookupOverride("unknown".padEnd(32, "a")) === null,
  "lookupOverride should return null for unknown"
);

// Default-mint picker is network-aware and returns base58.
for (const n of ["mainnet", "devnet", "testnet", "localnet"] as const) {
  const m = defaultMintForNetwork(n);
  assert(BASE58.test(m), `defaultMintForNetwork(${n}) not base58: ${m}`);
}
assert(
  defaultMintForNetwork("devnet") ===
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "devnet default should be devnet USDC"
);

console.log("OK — devnetFallback self-check passed");
