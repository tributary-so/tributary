import { PublicKey } from "@solana/web3.js";

/**
 * Shared form state for the topup policy configuration.
 * Owned by pages/Setup.tsx, threaded down to each step.
 */
export interface TopupFormState {
  /** Per-execute chunk, human USDC. */
  chunkUsdc: number;
  /** Period cap, human USDC. */
  capUsdc: number;
  /** Period length in seconds. */
  periodSeconds: number;
  /** Hot wallet pubkey (receives SOL). Empty string until entered. */
  hotWallet: string;
  /** SOL threshold — policy is valid when hot wallet native SOL < this. */
  thresholdSol: number;
  /** Unwrap WSOL -> native SOL via NATIVE_OUTPUT forward flag. */
  unwrap: boolean;
  /** DLMM LbPair address (preset or pasted). */
  poolAddress: string;
  /** Slippage in basis points (100 = 1%). */
  slippageBps: number;
  /** Selected PaymentGateway pubkey (from on-chain list). */
  gateway: string;
}

export const INITIAL_FORM: TopupFormState = {
  chunkUsdc: 50,
  capUsdc: 50,
  periodSeconds: 30 * 24 * 3600, // monthly
  hotWallet: "",
  thresholdSol: 0.5,
  unwrap: true,
  poolAddress: "", // filled by SwapStep default
  slippageBps: 100,
  gateway: "", // filled by GatewaySelect once gateways load
};

/** Period presets for the FundingStep selector. */
export const PERIOD_PRESETS: { label: string; seconds: number }[] = [
  { label: "Hourly", seconds: 3600 },
  { label: "Daily", seconds: 24 * 3600 },
  { label: "Weekly", seconds: 7 * 24 * 3600 },
  { label: "Monthly", seconds: 30 * 24 * 3600 },
  { label: "Custom", seconds: -1 },
];

export type FormPatch = Partial<TopupFormState>;

/** Returns an error message if the form is invalid, else null. */
export function validateForm(form: TopupFormState): string | null {
  if (!form.hotWallet) return "Enter the hot wallet that should receive SOL.";
  try {
    new PublicKey(form.hotWallet);
  } catch {
    return "Hot wallet is not a valid public key.";
  }
  if (!(form.thresholdSol > 0))
    return "SOL threshold must be greater than zero.";
  if (!(form.chunkUsdc > 0))
    return "Chunk per top-up must be greater than zero.";
  if (form.chunkUsdc > form.capUsdc) return "Chunk exceeds the period cap.";
  if (!(form.periodSeconds > 0))
    return "Period length must be greater than zero.";
  if (!form.poolAddress) return "Pick or paste a Meteora pool address.";
  try {
    new PublicKey(form.poolAddress);
  } catch {
    return "Pool address is not a valid public key.";
  }
  if (form.gateway) {
    try {
      new PublicKey(form.gateway);
    } catch {
      return "Selected gateway is not a valid public key.";
    }
  } else {
    return "Select a payment gateway.";
  }
  return null;
}
