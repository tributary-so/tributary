"use client";

import * as React from "react";
import { Copy, Check, ExternalLink, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { LineItem, CheckoutSessionManager } from "@tributary-so/payments";
import config from "@/constants";

export function CheckoutLinkForm() {
  const [copied, setCopied] = React.useState(false);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string>("");
  const [formData, setFormData] = React.useState({
    mode: "subscription" as "subscription" | "payment",
    tokenMint: config.usdcMint,
    recipient: "",
    gateway: config.gateway,
    amount: "",
    autoRenew: true,
    maxRenewals: "12",
    paymentFrequency: "monthly",
    trackingId: "",
    successUrl: "",
    cancelUrl: "",
    lineItems: [] as LineItem[],
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const lineItemsActive = formData.lineItems.length > 0;
  const computedAmount = lineItemsActive
    ? formData.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )
    : 0;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipient.trim()) {
      newErrors.recipient = "Recipient address is required";
    } else if (!isValidSolanaAddress(formData.recipient)) {
      newErrors.recipient = "Invalid Solana address";
    }

    if (!lineItemsActive && !formData.amount) {
      newErrors.amount = "Amount is required";
    } else if (!lineItemsActive && parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (formData.mode === "subscription") {
      if (formData.maxRenewals && parseInt(formData.maxRenewals) < 0) {
        newErrors.maxRenewals = "Max renewals must be 0 or greater";
      }
    }

    if (lineItemsActive) {
      formData.lineItems.forEach((item, index) => {
        if (!item.description.trim()) {
          newErrors[`lineItem_${index}_description`] =
            "Description is required";
        }
        if (item.unitPrice <= 0) {
          newErrors[`lineItem_${index}_price`] = "Price must be greater than 0";
        }
        if (item.quantity < 1) {
          newErrors[`lineItem_${index}_quantity`] =
            "Quantity must be at least 1";
        }
      });
    }

    if (formData.successUrl && !isValidUrl(formData.successUrl)) {
      newErrors.successUrl = "Invalid URL";
    }

    if (formData.cancelUrl && !isValidUrl(formData.cancelUrl)) {
      newErrors.cancelUrl = "Invalid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidSolanaAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const generateTrackingId = (): string => {
    return `trib_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  const handleGenerate = () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    const amount = lineItemsActive
      ? computedAmount
      : parseFloat(formData.amount || "0");

    const manager = new CheckoutSessionManager();
    manager.setBaseUrl(window.location.origin + "/#");

    if (formData.mode === "subscription") {
      const url = manager.encodeSubscriptionUrl({
        mode: "subscription",
        tokenMint: formData.tokenMint,
        recipient: formData.recipient,
        gateway: formData.gateway,
        amount,
        autoRenew: formData.autoRenew,
        maxRenewals: formData.maxRenewals
          ? parseInt(formData.maxRenewals)
          : null,
        paymentFrequency: formData.paymentFrequency,
        startTime: null,
        trackingId: formData.trackingId || generateTrackingId(),
        lineItems: formData.lineItems,
        successUrl: formData.successUrl,
        cancelUrl: formData.cancelUrl,
      });
      setCheckoutUrl(url);
    } else {
      const url = manager.encodeUrl({
        mode: "payment",
        tokenMint: formData.tokenMint,
        recipient: formData.recipient,
        amount,
        trackingId: formData.trackingId || generateTrackingId(),
        successUrl: formData.successUrl,
        cancelUrl: formData.cancelUrl,
      });
      setCheckoutUrl(url);
    }

    toast.success("Checkout link generated!");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        { description: "", unitPrice: 0, quantity: 1 },
      ],
    });
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const newLineItems = [...formData.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setFormData({ ...formData, lineItems: newLineItems });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
          Payment Type
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, mode: "subscription" })}
            className={`flex-1 py-2 px-4 border transition-all text-sm ${
              formData.mode === "subscription"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent text-foreground"
            }`}
          >
            Subscription
          </button>
          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, mode: "payment", lineItems: [] })
            }
            className={`flex-1 py-2 px-4 border transition-all text-sm ${
              formData.mode === "payment"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent text-foreground"
            }`}
          >
            One-Time
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
          Recipient Address
        </label>
        <input
          type="text"
          value={formData.recipient}
          onChange={(e) =>
            setFormData({ ...formData, recipient: e.target.value })
          }
          placeholder="Your Solana wallet address"
          className={`w-full px-4 py-2 bg-background border ${
            errors.recipient ? "border-destructive" : "border-border"
          } focus:border-primary focus:outline-none transition-colors text-sm`}
        />
        {errors.recipient && (
          <p className="mt-1 text-sm text-destructive">{errors.recipient}</p>
        )}
      </div>

      {(formData.mode === "payment" || !lineItemsActive) && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
            {formData.mode === "payment"
              ? "Total Amount (USDC)"
              : "Amount (USDC)"}
          </label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            placeholder="e.g., 10"
            step="0.01"
            min="0"
            className={`w-full px-4 py-2 bg-background border ${
              errors.amount ? "border-destructive" : "border-border"
            } focus:border-primary focus:outline-none transition-colors text-sm`}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-destructive">{errors.amount}</p>
          )}
        </div>
      )}

      {formData.mode === "subscription" && (
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

          {formData.lineItems.length === 0 ? (
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
              {formData.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-start"
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                    placeholder="Product/Service name"
                    className={`col-span-5 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                      errors[`lineItem_${index}_description`]
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
                        index,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    className={`col-span-3 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                      errors[`lineItem_${index}_price`]
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
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1
                      )
                    }
                    placeholder="1"
                    className={`col-span-3 px-3 py-2 bg-background border text-sm focus:border-primary focus:outline-none ${
                      errors[`lineItem_${index}_quantity`]
                        ? "border-destructive"
                        : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
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
      )}

      {formData.mode === "subscription" && (
        <>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
              Payment Frequency
            </label>
            <select
              value={formData.paymentFrequency}
              onChange={(e) =>
                setFormData({ ...formData, paymentFrequency: e.target.value })
              }
              className="w-full px-4 py-2 bg-background border border-border focus:border-primary focus:outline-none text-sm"
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
              checked={formData.autoRenew}
              onChange={(e) =>
                setFormData({ ...formData, autoRenew: e.target.checked })
              }
              className="w-4 h-4 border border-border"
            />
            <label htmlFor="autoRenew" className="text-sm text-foreground">
              Auto-renew payment
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
              Max Renewals (optional)
            </label>
            <input
              type="number"
              value={formData.maxRenewals}
              onChange={(e) =>
                setFormData({ ...formData, maxRenewals: e.target.value })
              }
              placeholder="Leave empty for unlimited"
              min="0"
              className={`w-full px-4 py-2 bg-background border ${
                errors.maxRenewals ? "border-destructive" : "border-border"
              } focus:border-primary focus:outline-none text-sm`}
            />
            {errors.maxRenewals && (
              <p className="mt-1 text-sm text-destructive">
                {errors.maxRenewals}
              </p>
            )}
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
          Success URL (optional)
        </label>
        <input
          type="url"
          value={formData.successUrl}
          onChange={(e) =>
            setFormData({ ...formData, successUrl: e.target.value })
          }
          placeholder="https://yourapp.com/success"
          className={`w-full px-4 py-2 bg-background border ${
            errors.successUrl ? "border-destructive" : "border-border"
          } focus:border-primary focus:outline-none text-sm`}
        />
        {errors.successUrl && (
          <p className="mt-1 text-sm text-destructive">{errors.successUrl}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
          Cancel URL (optional)
        </label>
        <input
          type="url"
          value={formData.cancelUrl}
          onChange={(e) =>
            setFormData({ ...formData, cancelUrl: e.target.value })
          }
          placeholder="https://yourapp.com/cancel"
          className={`w-full px-4 py-2 bg-background border ${
            errors.cancelUrl ? "border-destructive" : "border-border"
          } focus:border-primary focus:outline-none text-sm`}
        />
        {errors.cancelUrl && (
          <p className="mt-1 text-sm text-destructive">{errors.cancelUrl}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-[0.12em]">
          Tracking ID (optional)
        </label>
        <input
          type="text"
          value={formData.trackingId}
          onChange={(e) =>
            setFormData({ ...formData, trackingId: e.target.value })
          }
          placeholder="Auto-generated if empty"
          className="w-full px-4 py-2 bg-background border border-border focus:border-primary focus:outline-none text-sm"
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
