/**
 * API base URL for Tributary REST endpoints. Ponytail: single const, no
 * config object — only one consumer right now (the asset resolver on the
 * account page). Add a config object when there's a second consumer.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://api.tributary.so'
