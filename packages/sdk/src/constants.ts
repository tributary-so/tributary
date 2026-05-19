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
} as const;
