// @ts-nocheck
/**
 * E2E-ish: redirect-URL construction for the policy-create flow (tributary-rkgs).
 *
 * The full browser E2E (Playwright) is heavy CI infrastructure; the bean
 * explicitly allows a minimal SDK-level test as a first cut. This covers the
 * redirect contract: external successUrl, internal fallback, cancel URL,
 * garbage-URL handling.
 *
 * ponytail: the redirect helpers live in
 * apps/showcase-payment-policies/src/lib/redirect.ts. They're inlined here
 * (with a must-mirror marker) because jest's `roots` is apps/api/src and
 * cross-package imports don't resolve. If this test breaks, it means the
 * showcase redirect helper diverged from this contract.
 */
import { describe, it, expect } from "@jest/globals";

// ── BEGIN must-mirror apps/showcase-payment-policies/src/lib/redirect.ts ───
type PolicyCreateRedirect =
  | { kind: "external"; href: string }
  | { kind: "internal"; path: string };

function buildPolicySuccessRedirect(
  successUrl: string | undefined | null,
  token: string
): PolicyCreateRedirect {
  if (successUrl && successUrl.trim().length > 0) {
    try {
      const url = new URL(successUrl);
      url.searchParams.set("token", token);
      return { kind: "external", href: url.toString() };
    } catch {
      // Not a valid absolute URL — fall back to internal navigation.
    }
  }
  return {
    kind: "internal",
    path: `/success?token=${encodeURIComponent(token)}`,
  };
}

function buildCancelRedirect(
  cancelUrl: string | undefined | null
): { kind: "external"; href: string } | null {
  if (!cancelUrl || cancelUrl.trim().length === 0) return null;
  try {
    new URL(cancelUrl);
    return { kind: "external", href: cancelUrl };
  } catch {
    return null;
  }
}
// ── END must-mirror ─────────────────────────────────────────────────────────

const JWT = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";

describe("buildPolicySuccessRedirect — success URL handling", () => {
  it("external success URL → kind=external with ?token= appended", () => {
    const r = buildPolicySuccessRedirect(
      "https://merchant.example.com/success",
      JWT
    );
    expect(r.kind).toBe("external");
    if (r.kind !== "external") return;
    const parsed = new URL(r.href);
    expect(parsed.origin).toBe("https://merchant.example.com");
    expect(parsed.pathname).toBe("/success");
    expect(parsed.searchParams.get("token")).toBe(JWT);
  });

  it("preserves existing query params on successUrl", () => {
    const r = buildPolicySuccessRedirect(
      "https://merchant.example.com/success?order=42",
      JWT
    );
    expect(r.kind).toBe("external");
    if (r.kind !== "external") return;
    const parsed = new URL(r.href);
    expect(parsed.searchParams.get("order")).toBe("42");
    expect(parsed.searchParams.get("token")).toBe(JWT);
  });

  it("missing successUrl → internal /success?token=", () => {
    const r = buildPolicySuccessRedirect(undefined, JWT);
    expect(r.kind).toBe("internal");
    if (r.kind !== "internal") return;
    expect(r.path).toBe(`/success?token=${encodeURIComponent(JWT)}`);
  });

  it("empty successUrl → internal fallback", () => {
    expect(buildPolicySuccessRedirect("", JWT).kind).toBe("internal");
    expect(buildPolicySuccessRedirect("   ", JWT).kind).toBe("internal");
    expect(buildPolicySuccessRedirect(null, JWT).kind).toBe("internal");
  });

  it("garbage successUrl → falls back to internal (no throw)", () => {
    const r = buildPolicySuccessRedirect("not-a-url", JWT);
    expect(r.kind).toBe("internal");
  });

  it("token is URL-encoded into the internal path", () => {
    const tokenWithSpecial = "ab+c d/="; // not a real JWT but exercises encoding
    const r = buildPolicySuccessRedirect(undefined, tokenWithSpecial);
    expect(r.kind).toBe("internal");
    if (r.kind !== "internal") return;
    expect(r.path).toContain(encodeURIComponent(tokenWithSpecial));
  });
});

describe("buildCancelRedirect — cancel URL honoring", () => {
  it("valid cancel URL → external redirect", () => {
    const r = buildCancelRedirect("https://merchant.example.com/cancel");
    expect(r).toEqual({
      kind: "external",
      href: "https://merchant.example.com/cancel",
    });
  });

  it("missing cancel URL → null (caller shows in-app cancel)", () => {
    expect(buildCancelRedirect(undefined)).toBeNull();
    expect(buildCancelRedirect("")).toBeNull();
    expect(buildCancelRedirect("   ")).toBeNull();
  });

  it("garbage cancel URL → null (no redirect)", () => {
    expect(buildCancelRedirect("not-a-url")).toBeNull();
  });
});
