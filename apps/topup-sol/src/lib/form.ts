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
  /** Optional existing gateway pubkey. Empty = auto-create with cold wallet. */
  customGateway: string;
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
  customGateway: "",
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
