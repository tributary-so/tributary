/**
 * Unit conversion helpers.
 *
 * SOL uses 1e9 lamports (native). USDC uses 1e6 raw units (SPL, 6 decimals).
 * The demo UI talks in human units (SOL, USDC); these bridge to on-chain raw.
 */

/** Lamports per 1 SOL. */
export const LAMPORTS_PER_SOL = 1_000_000_000;
/** Raw units per 1 USDC. */
export const RAW_PER_USDC = 1_000_000;

/** SOL (human) → lamports (on-chain). */
export function solToLamports(sol: number): bigint {
  if (!Number.isFinite(sol) || sol < 0) return 0n;
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

/** Lamports → SOL (human, fixed 4 dp). */
export function lamportsToSol(lamports: number | bigint): string {
  const l = typeof lamports === "bigint" ? Number(lamports) : lamports;
  return (l / LAMPORTS_PER_SOL).toFixed(4);
}

/** USDC (human) → raw (on-chain). */
export function usdcToRaw(usdc: number): bigint {
  if (!Number.isFinite(usdc) || usdc < 0) return 0n;
  return BigInt(Math.round(usdc * RAW_PER_USDC));
}

/** Raw USDC → human string (2 dp). */
export function rawToUsdc(raw: number | bigint): string {
  const r = typeof raw === "bigint" ? Number(raw) : raw;
  return (r / RAW_PER_USDC).toFixed(2);
}

/** Compact number formatting for display (1.2K, 3.4M). */
export function formatShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
