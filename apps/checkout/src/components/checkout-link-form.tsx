"use client";

import * as React from "react";
import { Copy, Check, ExternalLink, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  LineItem,
  CheckoutSessionManager,
  CheckoutParams,
} from "@tributary-so/payments";
import config from "@/constants";

type FormMode =
  | "subscription"
  | "payment"
  | "milestone"
  | "payAsYouGo"
  | "oneTime"
  | "upTo";

const MODE_LABELS: Record<FormMode, string> = {
  subscription: "Subscription",
  payment: "One-Time (transfer)",
  milestone: "Milestone",
  payAsYouGo: "Pay-as-you-go",
  oneTime: "One-Time (policy)",
  upTo: "UpTo",
};

interface MilestoneEntry {
  amount: string;
  timestamp: string; // datetime-local input value
}

function toUnixSeconds(localValue: string): number {
  if (!localValue) return 0;
  const ms = Date.parse(localValue);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function generateTrackingId(): string {
  return `trib_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function CheckoutLinkForm() {
  const [copied, setCopied] = React.useState(false);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string>("");
  const [mode, setMode] = React.useState<FormMode>("subscription");
  const [tokenMint] = React.useState(config.usdcMint);
  const [recipient, setRecipient] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [successUrl, setSuccessUrl] = React.useState("");
  const [cancelUrl, setCancelUrl] = React.useState("");
  const [trackingId, setTrackingId] = React.useState("");

  // subscription-only
  const [autoRenew, setAutoRenew] = React.useState(true);
  const [maxRenewals, setMaxRenewals] = React.useState("12");
  const [paymentFrequency, setPaymentFrequency] = React.useState("monthly");
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);

  // milestone
  const [milestones, setMilestones] = React.useState<MilestoneEntry[]>([
    { amount: "", timestamp: "" },
  ]);
  const [signerType, setSignerType] = React.useState<
    "none" | "gateway" | "owner" | "recipient"
  >("none");

  // payAsYouGo
  const [maxAmountPerPeriod, setMaxAmountPerPeriod] = React.useState("");
  const [maxChunkAmount, setMaxChunkAmount] = React.useState("");
  const [periodLengthSeconds, setPeriodLengthSeconds] = React.useState("");

  // oneTime policy
  const [dueDate, setDueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");

  // upTo
  const [maxAmount, setMaxAmount] = React.useState("");
  const [validAfter, setValidAfter] = React.useState("");
  const [deadline, setDeadline] = React.useState("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const lineItemsActive = lineItems.length > 0;
  const computedAmount = lineItemsActive
    ? lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    : 0;

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};

    if (!recipient.trim()) e.recipient = "Recipient address is required";
    else if (!isValidSolanaAddress(recipient))
      e.recipient = "Invalid Solana address";

    if (mode === "subscription") {
      if (!lineItemsActive) {
        if (!amount) e.amount = "Amount is required";
        else if (parseFloat(amount) <= 0)
          e.amount = "Amount must be greater than 0";
      }
      if (maxRenewals && parseInt(maxRenewals) < 0)
        e.maxRenewals = "Max renewals must be 0 or greater";
      lineItems.forEach((item, i) => {
        if (!item.description.trim())
          e[`lineItem_${i}_description`] = "Description is required";
        if (item.unitPrice <= 0)
          e[`lineItem_${i}_price`] = "Price must be greater than 0";
        if (item.quantity < 1)
          e[`lineItem_${i}_quantity`] = "Quantity must be at least 1";
      });
    } else if (mode === "payment" || mode === "oneTime") {
      if (!amount) e.amount = "Amount is required";
      else if (parseFloat(amount) <= 0)
        e.amount = "Amount must be greater than 0";
    } else if (mode === "payAsYouGo") {
      if (!maxAmountPerPeriod) e.maxAmountPerPeriod = "Required";
      else if (parseFloat(maxAmountPerPeriod) <= 0)
        e.maxAmountPerPeriod = "Must be > 0";
      if (!maxChunkAmount) e.maxChunkAmount = "Required";
      else if (parseFloat(maxChunkAmount) <= 0)
        e.maxChunkAmount = "Must be > 0";
      else if (parseFloat(maxChunkAmount) > parseFloat(maxAmountPerPeriod))
        e.maxChunkAmount = "Must be ≤ max per period";
      if (!periodLengthSeconds) e.periodLengthSeconds = "Required";
      else if (parseInt(periodLengthSeconds) <= 0)
        e.periodLengthSeconds = "Must be > 0";
    } else if (mode === "upTo") {
      if (!maxAmount) e.maxAmount = "Required";
      else if (parseFloat(maxAmount) <= 0) e.maxAmount = "Must be > 0";
      if (!deadline) e.deadline = "Deadline is required";
      else if (toUnixSeconds(deadline) <= 0) e.deadline = "Invalid date";
      if (validAfter && toUnixSeconds(validAfter) >= toUnixSeconds(deadline))
        e.validAfter = "Must be before deadline";
    } else if (mode === "milestone") {
      const active = milestones.filter((m) => m.amount || m.timestamp);
      if (active.length < 1) e.milestones = "At least 1 milestone required";
      if (active.length > 4) e.milestones = "Max 4 milestones";
      active.forEach((m, i) => {
        if (!m.amount || parseFloat(m.amount) <= 0)
          e[`m_${i}_amount`] = "Amount > 0 required";
        if (!m.timestamp) e[`m_${i}_ts`] = "Date required";
      });
      // timestamps ascending
      for (let i = 1; i < active.length; i++) {
        if (
          toUnixSeconds(active[i].timestamp) <=
          toUnixSeconds(active[i - 1].timestamp)
        ) {
          e[`m_${i}_ts`] = "Must be after previous";
          break;
        }
      }
    }

    if (successUrl && !isValidUrl(successUrl)) e.successUrl = "Invalid URL";
    if (cancelUrl && !isValidUrl(cancelUrl)) e.cancelUrl = "Invalid URL";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildParams = (): CheckoutParams => {
    const tid = trackingId || generateTrackingId();
    const base = {
      tokenMint,
      recipient,
      gateway: config.gateway,
      trackingId: tid,
      successUrl: successUrl || undefined,
      cancelUrl: cancelUrl || undefined,
    };

    switch (mode) {
      case "subscription":
        return {
          ...base,
          mode: "subscription",
          amount: lineItemsActive ? computedAmount : parseFloat(amount || "0"),
          autoRenew,
          maxRenewals: maxRenewals ? parseInt(maxRenewals) : null,
          paymentFrequency,
          startTime: null,
          lineItems,
        };
      case "payment":
        return {
          mode: "payment",
          tokenMint,
          recipient,
          amount: parseFloat(amount || "0"),
          trackingId: tid,
          successUrl: successUrl || undefined,
          cancelUrl: cancelUrl || undefined,
        };
      case "milestone": {
        const active = milestones.filter((m) => m.amount && m.timestamp);
        const signerBit =
          signerType === "gateway"
            ? 0b0010
            : signerType === "owner"
            ? 0b0100
            : signerType === "recipient"
            ? 0b1000
            : 0;
        return {
          ...base,
          mode: "milestone",
          milestoneAmounts: active.map((m) => parseFloat(m.amount)),
          milestoneTimestamps: active.map((m) => toUnixSeconds(m.timestamp)),
          releaseCondition: 0b0001 | signerBit, // bit0 = due-date gate
          totalMilestones: active.length,
        };
      }
      case "payAsYouGo":
        return {
          ...base,
          mode: "payAsYouGo",
          maxAmountPerPeriod: parseFloat(maxAmountPerPeriod),
          maxChunkAmount: parseFloat(maxChunkAmount),
          periodLengthSeconds: parseInt(periodLengthSeconds),
        };
      case "oneTime":
        return {
          ...base,
          mode: "oneTime",
          amount: parseFloat(amount),
          dueDate: dueDate ? toUnixSeconds(dueDate) : undefined,
          expiryDate: expiryDate ? toUnixSeconds(expiryDate) : undefined,
        };
      case "upTo":
        return {
          ...base,
          mode: "upTo",
          maxAmount: parseFloat(maxAmount),
          validAfter: validAfter ? toUnixSeconds(validAfter) : undefined,
          deadline: toUnixSeconds(deadline),
        };
    }
  };

  const handleGenerate = () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }
    const manager = new CheckoutSessionManager();
    manager.setBaseUrl(window.location.origin + "/#");
    try {
      const url = manager.encodeUrl(buildParams());
      setCheckoutUrl(url);
      toast.success("Checkout link generated!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate link"
      );
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const addLineItem = () =>
    setLineItems([
      ...lineItems,
      { description: "", unitPrice: 0, quantity: 1 },
    ]);
  const updateLineItem = (
    i: number,
    field: keyof LineItem,
    v: string | number
  ) => {
    const next = [...lineItems];
    next[i] = { ...next[i], [field]: v };
    setLineItems(next);
  };
  const removeLineItem = (i: number) =>
    setLineItems(lineItems.filter((_, idx) => idx !== i));

  const inputCls = (k?: string) =>
    `w-full px-4 py-2 bg-background border ${
      k ? "border-destructive" : "border-border"
    } focus:border-primary focus:outline-none transition-colors text-sm`;
  const labelCls =
    "block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]";

  return (
    <div className="space-y-6">
      <div>
        <label className={labelCls}>Payment Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(MODE_LABELS) as FormMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`py-2 px-3 border transition-all text-sm ${
                mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent text-foreground"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Recipient Address</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Your Solana wallet address"
          className={inputCls(errors.recipient)}
        />
        {errors.recipient && (
          <p className="mt-1 text-sm text-destructive">{errors.recipient}</p>
        )}
      </div>

      {(mode === "payment" ||
        mode === "oneTime" ||
        (mode === "subscription" && !lineItemsActive)) && (
        <div>
          <label className={labelCls}>
            {mode === "subscription" ? "Amount (USDC)" : "Total Amount (USDC)"}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 10"
            step="0.01"
            min="0"
            className={inputCls(errors.amount)}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-destructive">{errors.amount}</p>
          )}
        </div>
      )}

      {mode === "subscription" && (
        <>
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-foreground uppercase tracking-[0.12em]">
                Line Items (optional)
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Using base amount from above. Add line items for multi-item
                orders.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 text-xs text-muted-foreground font-medium uppercase tracking-[0.08em]">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-3">Price ($)</div>
                  <div className="col-span-3">Quantity</div>
                  <div className="col-span-1" />
                </div>
                {lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-3 items-start">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(i, "description", e.target.value)
                      }
                      placeholder="Product/Service name"
                      className={`col-span-5 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                        errors[`lineItem_${i}_description`]
                          ? "border-destructive"
                          : "border-border"
                      }`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateLineItem(
                          i,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className={`col-span-3 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                        errors[`lineItem_${i}_price`]
                          ? "border-destructive"
                          : "border-border"
                      }`}
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          i,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      placeholder="1"
                      className={`col-span-3 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                        errors[`lineItem_${i}_quantity`]
                          ? "border-destructive"
                          : "border-border"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="col-span-1 p-2 text-muted-foreground hover:text-destructive transition-colors flex justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {lineItemsActive && (
              <div className="mt-3 border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Computed Total:
                  </span>
                  <span className="text-sm font-bold text-primary">
                    ${computedAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Payment Frequency</label>
            <select
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(e.target.value)}
              className={inputCls()}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 border border-border"
            />
            <label htmlFor="autoRenew" className="text-sm text-foreground">
              Auto-renew payment
            </label>
          </div>

          <div>
            <label className={labelCls}>Max Renewals (optional)</label>
            <input
              type="number"
              value={maxRenewals}
              onChange={(e) => setMaxRenewals(e.target.value)}
              placeholder="Leave empty for unlimited"
              min="0"
              className={inputCls(errors.maxRenewals)}
            />
            {errors.maxRenewals && (
              <p className="mt-1 text-sm text-destructive">
                {errors.maxRenewals}
              </p>
            )}
          </div>
        </>
      )}

      {mode === "milestone" && (
        <>
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-foreground uppercase tracking-[0.12em]">
                Milestones (1–4)
              </label>
              {milestones.length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    setMilestones([
                      ...milestones,
                      { amount: "", timestamp: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              )}
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={m.amount}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[i] = { ...next[i], amount: e.target.value };
                      setMilestones(next);
                    }}
                    placeholder="Amount"
                    className={`col-span-4 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                      errors[`m_${i}_amount`]
                        ? "border-destructive"
                        : "border-border"
                    }`}
                  />
                  <input
                    type="datetime-local"
                    value={m.timestamp}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[i] = { ...next[i], timestamp: e.target.value };
                      setMilestones(next);
                    }}
                    className={`col-span-7 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                      errors[`m_${i}_ts`]
                        ? "border-destructive"
                        : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMilestones(milestones.filter((_, idx) => idx !== i))
                    }
                    className="col-span-1 p-2 text-muted-foreground hover:text-destructive transition-colors flex justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.milestones && (
              <p className="mt-1 text-sm text-destructive">
                {errors.milestones}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Release signer</label>
            <select
              value={signerType}
              onChange={(e) =>
                setSignerType(e.target.value as typeof signerType)
              }
              className={inputCls()}
            >
              <option value="none">None (due-date only)</option>
              <option value="gateway">Gateway</option>
              <option value="owner">Owner</option>
              <option value="recipient">Recipient</option>
            </select>
          </div>
        </>
      )}

      {mode === "payAsYouGo" && (
        <>
          <div>
            <label className={labelCls}>Max amount per period (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxAmountPerPeriod}
              onChange={(e) => setMaxAmountPerPeriod(e.target.value)}
              placeholder="e.g., 100"
              className={inputCls(errors.maxAmountPerPeriod)}
            />
            {errors.maxAmountPerPeriod && (
              <p className="mt-1 text-sm text-destructive">
                {errors.maxAmountPerPeriod}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Max per claim (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxChunkAmount}
              onChange={(e) => setMaxChunkAmount(e.target.value)}
              placeholder="e.g., 10"
              className={inputCls(errors.maxChunkAmount)}
            />
            {errors.maxChunkAmount && (
              <p className="mt-1 text-sm text-destructive">
                {errors.maxChunkAmount}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Period length (seconds)</label>
            <input
              type="number"
              min="1"
              value={periodLengthSeconds}
              onChange={(e) => setPeriodLengthSeconds(e.target.value)}
              placeholder="e.g., 86400 for a day"
              className={inputCls(errors.periodLengthSeconds)}
            />
            {errors.periodLengthSeconds && (
              <p className="mt-1 text-sm text-destructive">
                {errors.periodLengthSeconds}
              </p>
            )}
          </div>
        </>
      )}

      {mode === "oneTime" && (
        <>
          <div>
            <label className={labelCls}>Due date (optional)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label className={labelCls}>Expiry date (optional)</label>
            <input
              type="datetime-local"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={inputCls()}
            />
          </div>
        </>
      )}

      {mode === "upTo" && (
        <>
          <div>
            <label className={labelCls}>Max amount (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="e.g., 50"
              className={inputCls(errors.maxAmount)}
            />
            {errors.maxAmount && (
              <p className="mt-1 text-sm text-destructive">
                {errors.maxAmount}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Valid after (optional)</label>
            <input
              type="datetime-local"
              value={validAfter}
              onChange={(e) => setValidAfter(e.target.value)}
              className={inputCls(errors.validAfter)}
            />
            {errors.validAfter && (
              <p className="mt-1 text-sm text-destructive">
                {errors.validAfter}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls(errors.deadline)}
            />
            {errors.deadline && (
              <p className="mt-1 text-sm text-destructive">{errors.deadline}</p>
            )}
          </div>
        </>
      )}

      <div>
        <label className={labelCls}>Success URL (optional)</label>
        <input
          type="url"
          value={successUrl}
          onChange={(e) => setSuccessUrl(e.target.value)}
          placeholder="https://yourapp.com/success"
          className={inputCls(errors.successUrl)}
        />
        {errors.successUrl && (
          <p className="mt-1 text-sm text-destructive">{errors.successUrl}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Cancel URL (optional)</label>
        <input
          type="url"
          value={cancelUrl}
          onChange={(e) => setCancelUrl(e.target.value)}
          placeholder="https://yourapp.com/cancel"
          className={inputCls(errors.cancelUrl)}
        />
        {errors.cancelUrl && (
          <p className="mt-1 text-sm text-destructive">{errors.cancelUrl}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Tracking ID (optional)</label>
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Auto-generated if empty"
          className={inputCls()}
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        className="w-full py-3 bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors uppercase tracking-[0.12em] text-sm"
      >
        Generate Checkout Link
      </button>

      {checkoutUrl && (
        <div className="border border-border p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-foreground uppercase tracking-[0.12em]">
              Your Checkout Link
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
          <div className="bg-muted/50 p-4 break-all text-sm font-mono text-muted-foreground border border-border">
            {checkoutUrl}
          </div>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Test Checkout Page
          </a>
        </div>
      )}
    </div>
  );
}
