// ponytail: minimal config. Env-driven if needed later; for now both
// api + checkout URLs are public/stable.
export const API_BASE_URL =
  (import.meta.env.VITE_TRIBUTARY_API_BASE_URL as string | undefined) ?? 'https://api.tributary.so'
export const CHECKOUT_BASE_URL = 'https://checkout.tributary.so'
