/**
 * Tally link for the "Request a gateway" CTA — surfaces on /gateways (header
 * + empty state) and /gateway/manage (empty state). Single source of truth.
 */
export const TALLY_REQUEST_URL = 'https://tally.so/r/RGbbGl'

/**
 * Base URL for the Tributary events API. The merchant layer mounts under
 * /v1/gateway/:gateway/{auth,merchant} (ADR-0026). Defaults to localhost dev;
 * override with VITE_EVENTS_API_URL in production.
 */
export const MERCHANT_API_BASE = (import.meta.env.VITE_EVENTS_API_URL as string | undefined) ?? 'http://localhost:3001'
