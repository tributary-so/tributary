/**
 * Redirect-URL builder for the policy-create flow.
 *
 * Given a caller-supplied `successUrl` (or empty) and a freshly-issued JWT,
 * returns one of:
 *   - `{ kind: 'external', href }` — redirect to `successUrl?token=<jwt>`
 *   - `{ kind: 'internal', path }`  — navigate to `/success?token=<jwt>`
 *
 * If `cancelUrl` is supplied and the form is cancelled, the caller redirects
 * to it verbatim via {@link buildCancelRedirect}.
 *
 * Extracted from `policy-inputs.tsx handleSubmit` so the redirect contract
 * is unit-testable without a browser.
 */
export type PolicyCreateRedirect = { kind: 'external'; href: string } | { kind: 'internal'; path: string }

export function buildPolicySuccessRedirect(successUrl: string | undefined | null, token: string): PolicyCreateRedirect {
  if (successUrl && successUrl.trim().length > 0) {
    try {
      const url = new URL(successUrl)
      url.searchParams.set('token', token)
      return { kind: 'external', href: url.toString() }
    } catch {
      // Not a valid absolute URL — fall back to internal navigation.
    }
  }
  return { kind: 'internal', path: `/success?token=${encodeURIComponent(token)}` }
}

/**
 * Honors the cancel URL if set. Returns `null` when no external cancel is
 * configured (caller shows the in-app cancel flow).
 */
export function buildCancelRedirect(cancelUrl: string | undefined | null): { kind: 'external'; href: string } | null {
  if (!cancelUrl || cancelUrl.trim().length === 0) return null
  try {
    // Validate; throw on garbage.
    new URL(cancelUrl)
    return { kind: 'external', href: cancelUrl }
  } catch {
    return null
  }
}
