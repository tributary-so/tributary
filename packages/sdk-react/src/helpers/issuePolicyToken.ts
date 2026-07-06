import { PublicKey } from "@solana/web3.js";

export interface IssuePolicyTokenParams {
  /** Caller wallet (becomes JWT `sub`). */
  walletPublicKey: PublicKey;
  /** API base URL (e.g. `https://api.tributary.so`). */
  apiBaseUrl: string;
  /** Payment recipient (optional filter). */
  recipient?: PublicKey;
  /** SPL token mint (optional filter). */
  tokenMint?: PublicKey;
  /** Specific policy address (optional, most precise). */
  policyAddress?: PublicKey;
  /** Checkout tracking ID (optional, matched against memo). */
  trackingId?: string;
  /** Polling timeout. Defaults to 30s. */
  timeoutMs?: number;
}

export interface IssuePolicyTokenResult {
  token: string;
  expiresAt: number;
}

/**
 * Poll `POST /v1/tokens/issue` until a JWT is issued or the timeout expires.
 *
 * Generalized successor to `issueSubscriptionToken` and `issueOneTimeToken`
 * in apps/checkout/src/lib/tributary.ts. Works for every PaymentPolicy variant
 * (subscription / milestone / payAsYouGo / oneTime / upTo) — the server
 * inspects the policy and emits a `policies: PolicyClaim[]` payload (ADR-0024).
 *
 * For direct-transfer payments (ADR-0004) keep using the dedicated
 * `issueDirectPaymentToken` helper — that flow keys off `transactionSignature`
 * rather than a policy address.
 */
export async function issuePolicyToken(
  params: IssuePolicyTokenParams
): Promise<IssuePolicyTokenResult> {
  const {
    walletPublicKey,
    apiBaseUrl,
    recipient,
    tokenMint,
    policyAddress,
    trackingId,
    timeoutMs = 30_000,
  } = params;

  const body: Record<string, string> = {
    walletPublicKey: walletPublicKey.toString(),
  };
  if (recipient) body.recipient = recipient.toString();
  if (tokenMint) body.tokenMint = tokenMint.toString();
  if (policyAddress) body.policyAddress = policyAddress.toString();
  if (trackingId) body.trackingId = trackingId;

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/tokens/issue`;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return (await response.json()) as IssuePolicyTokenResult;
    }

    // 404 = server hasn't seen the policy yet (slot lag); keep polling.
    // Anything else (400/422/500) surfaces immediately.
    if (response.status !== 404) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Token issuance failed (${response.status}): ${
          text || response.statusText
        }`
      );
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("Timed out waiting for policy confirmation");
}
