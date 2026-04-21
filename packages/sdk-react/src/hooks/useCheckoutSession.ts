import { useMemo } from "react";
import {
  CheckoutParams,
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";

export type CheckoutOptions = {
  mode: "payment" | "subscription";
  tokenMint: string;
  recipient: string;
  gateway?: string;
  amount: number;
  trackingId?: string;
  successPath?: string;
  cancelPath?: string;
  paymentFrequency?: string;
  autoRenew?: boolean;
  maxRenewals?: number | null;
  memo?: string;
};

export function useCheckoutSession(checkoutBaseUrl: string) {
  const manager = useMemo(() => {
    const m = new CheckoutSessionManager();
    m.setBaseUrl(`${checkoutBaseUrl}/#`);
    return m;
  }, [checkoutBaseUrl]);

  const buildCallbackUrls = (successPath?: string, cancelPath?: string) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return {
      successUrl: `${base}${successPath ?? "#/success"}`,
      cancelUrl: `${base}${cancelPath ?? "#/cancel"}`,
    };
  };

  const buildParams = (opts: CheckoutOptions): CheckoutParams => {
    const { successUrl, cancelUrl } = buildCallbackUrls(
      opts.successPath,
      opts.cancelPath
    );

    if (opts.mode === "subscription") {
      return {
        mode: "subscription",
        tokenMint: opts.tokenMint,
        recipient: opts.recipient,
        gateway: opts.gateway!,
        amount: opts.amount,
        autoRenew: opts.autoRenew ?? true,
        maxRenewals: opts.maxRenewals ?? null,
        paymentFrequency: opts.paymentFrequency ?? "monthly",
        startTime: null,
        successUrl,
        cancelUrl,
        trackingId: opts.trackingId,
      } as SubscriptionParams;
    }

    return {
      mode: "payment",
      tokenMint: opts.tokenMint,
      recipient: opts.recipient,
      amount: opts.amount,
      successUrl,
      cancelUrl,
      trackingId: opts.trackingId,
      memo: opts.memo,
    };
  };

  const generateUrl = (opts: CheckoutOptions): string => {
    return manager.encodeUrl(buildParams(opts));
  };

  const initiate = (opts: CheckoutOptions): void => {
    window.location.href = generateUrl(opts);
  };

  return { generateUrl, initiate };
}
