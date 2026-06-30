/**
 * Protocol fee in basis points (bps). 100 bps = 1%.
 * This fee is deducted from each payment and distributed between protocol and gateway.
 */
export const PROTOCOL_FEE_BPS = 100;

/**
 * Maximum number of payment policies allowed per user.
 * This limit prevents excessive resource usage and ensures scalability.
 */
export const MAX_POLICIES_PER_USER = 10;

/**
 * Number of decimal places for token amounts in the Tributary protocol.
 * All token amounts are represented with 6 decimal places for consistency.
 */
export const TOKEN_DECIMALS = 6;

/**
 * Gateway feature flag bit positions.
 * Bit-vector stored in PaymentGateway.feature_flags (u8).
 */
export const GATEWAY_FEATURES = {
  /** Bit 0: Referral program enabled (1 = enabled) */
  REFERRAL: 0x01,
  /** Bit 1: Net amount mode — recipient receives exactly payment_amount, fees added on top (1 = net) */
  NET_AMOUNT: 0x02,
  /** Bit 2: Custom protocol fee enabled — overrides default 100 bps (1 = enabled) */
  CUSTOM_PROTOCOL_FEE: 0x04,
  /**
   * Bit 3: Permissionless composable execution enabled (ADR-0016).
   * When set, `executeComposable` admits any signer for CONFORMING
   * composable policies (min_output_amount = Some(>0)). The trusted three
   * (gateway signer / owner / recipient) always pass regardless. The
   * caller-conditional gate is enforced on-chain.
   */
  PERMISSIONLESS: 0x08,
} as const;

/**
 * Seed strings used for deriving Program Derived Addresses (PDAs) in the Tributary program.
 * These seeds ensure deterministic and collision-resistant address generation.
 */
export const SEEDS = {
  /** Seed for the program configuration PDA */
  CONFIG: "config",
  /** Seed for payment gateway PDAs */
  GATEWAY: "gateway",
  /** Seed for user payment account PDAs */
  USER_PAYMENT: "user_payment",
  /** Seed for payment policy PDAs */
  PAYMENT_POLICY: "payment_policy",
  /** Seed for payments delegate PDAs */
  PAYMENTS: "payments",
  /** Seed for referral account PDAs */
  REFERRAL: "referral",
  /** Seed for composable policy PDAs */
  COMPOSABLE_POLICY: "composable_policy",
  /** Seed for validation PDAs (stores assertion data for composable policies with validation) */
  VALIDATION_PDA: "composable_validation",
} as const;

/**
 * Capacity of the owner-pinned Lighthouse target-account set on a
 * `ValidationPda` (ADR-0016). Covers the highest assertion arity in use
 * today (`accountDelta` = 2). Callers pass a `PublicKey[]` to
 * `getCreateComposablePolicyInstruction` and the SDK normalises it to the
 * fixed-size `[Pubkey; 2]` the on-chain instruction expects.
 */
export const MAX_PINNED_VALIDATION_ACCOUNTS = 2;
