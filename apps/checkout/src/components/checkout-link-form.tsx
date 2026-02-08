"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LineItem, SubscriptionParams, EncodedSessionData } from "@tributary-so/payments";

export function CheckoutLinkForm() {
  const [copied, setCopied] = React.useState(false);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string>("");
  const [formData, setFormData] = React.useState({
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    recipient: "",
    gateway: "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
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
    ? formData.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
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

    if (formData.maxRenewals && parseInt(formData.maxRenewals) < 0) {
      newErrors.maxRenewals = "Max renewals must be 0 or greater";
    }

    if (lineItemsActive) {
      formData.lineItems.forEach((item, index) => {
        if (!item.description.trim()) {
          newErrors[`lineItem_${index}_description`] = "Description is required";
        }
        if (item.unitPrice <= 0) {
          newErrors[`lineItem_${index}_price`] = "Price must be greater than 0";
        }
        if (item.quantity < 1) {
          newErrors[`lineItem_${index}_quantity`] = "Quantity must be at least 1";
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
    try {
      // Check if it's a valid Solana address format (base58, 32-44 chars)
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    } catch {
      return false;
    }
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

  const encodeCheckoutUrl = (params: SubscriptionParams): string => {
    const data: EncodedSessionData = {
      tm: params.tokenMint,
      r: params.recipient,
      g: params.gateway,
      a: params.amount.toString(),
      ar: params.autoRenew,
      mr: params.maxRenewals?.toString() || "null",
      pf: params.paymentFrequency,
      st: params.startTime?.toString() || "null",
      tid: params.trackingId,
      li: params.lineItems ? JSON.stringify(params.lineItems) : "[]",
    };
    const jsonString = JSON.stringify(data);
    const base64 = Buffer.from(jsonString).toString("base64");
    const encoded = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return `${window.location.origin}/#/subscribe/${encoded}`;
  };

  const handleGenerate = () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    const amount = lineItemsActive ? computedAmount : parseFloat(formData.amount || "0");

    const url = encodeCheckoutUrl({
      tokenMint: formData.tokenMint,
      recipient: formData.recipient,
      gateway: formData.gateway,
      amount,
      autoRenew: formData.autoRenew,
      maxRenewals: formData.maxRenewals ? parseInt(formData.maxRenewals) : null,
      paymentFrequency: formData.paymentFrequency,
      startTime: null,
      trackingId: formData.trackingId || generateTrackingId(),
      lineItems: formData.lineItems,
    });

    setCheckoutUrl(url);
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
      lineItems: [...formData.lineItems, { description: "", unitPrice: 0, quantity: 1 }],
    });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-gray-50 rounded-2xl p-8"
    >
      <div className="space-y-6">
        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={formData.recipient}
            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
            placeholder="Your Solana wallet address"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.recipient ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.recipient && <p className="mt-1 text-sm text-red-600">{errors.recipient}</p>}
        </div>

        {/* Amount (if no line items) */}
        {!lineItemsActive && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g., 10"
              step="0.01"
              min="0"
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.amount ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
          </div>
        )}

        {/* Line Items */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Line Items (optional)
            </label>
            <button
              type="button"
              onClick={addLineItem}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Item
            </button>
          </div>

          {formData.lineItems.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Using base amount from above. Add line items for multi-item orders.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs text-gray-500 font-medium">
                <div className="col-span-5">Description</div>
                <div className="col-span-3">Price ($)</div>
                <div className="col-span-3">Quantity</div>
                <div className="col-span-1" />
              </div>
              {formData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    placeholder="Product/Service name"
                    className={`col-span-5 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors[`lineItem_${index}_description`]
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={`col-span-3 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors[`lineItem_${index}_price`] ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                    placeholder="1"
                    className={`col-span-3 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 ${
                      errors[`lineItem_${index}_quantity`] ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="col-span-1 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex justify-center"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {lineItemsActive && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-800">Computed Total:</span>
                <span className="text-sm font-bold text-blue-900">${computedAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Frequency
          </label>
          <select
            value={formData.paymentFrequency}
            onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Auto Renew */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoRenew"
            checked={formData.autoRenew}
            onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="autoRenew" className="text-sm text-gray-700">
            Auto-renew payment
          </label>
        </div>

        {/* Max Renewals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Renewals (optional)
          </label>
          <input
            type="number"
            value={formData.maxRenewals}
            onChange={(e) => setFormData({ ...formData, maxRenewals: e.target.value })}
            placeholder="Leave empty for unlimited"
            min="0"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.maxRenewals ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.maxRenewals && <p className="mt-1 text-sm text-red-600">{errors.maxRenewals}</p>}
        </div>

        {/* Success URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Success URL (optional)
          </label>
          <input
            type="url"
            value={formData.successUrl}
            onChange={(e) => setFormData({ ...formData, successUrl: e.target.value })}
            placeholder="https://yourapp.com/success"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.successUrl ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.successUrl && <p className="mt-1 text-sm text-red-600">{errors.successUrl}</p>}
        </div>

        {/* Cancel URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cancel URL (optional)
          </label>
          <input
            type="url"
            value={formData.cancelUrl}
            onChange={(e) => setFormData({ ...formData, cancelUrl: e.target.value })}
            placeholder="https://yourapp.com/cancel"
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.cancelUrl ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          {errors.cancelUrl && <p className="mt-1 text-sm text-red-600">{errors.cancelUrl}</p>}
        </div>

        {/* Tracking ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tracking ID (optional)
          </label>
          <input
            type="text"
            value={formData.trackingId}
            onChange={(e) => setFormData({ ...formData, trackingId: e.target.value })}
            placeholder="Auto-generated if empty"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-4 bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Generate Checkout Link
        </button>

        {/* Generated URL */}
        {checkoutUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">Your Checkout Link</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-gray-50 rounded-lg p-4 break-all text-sm font-mono text-gray-700 border border-gray-200">
              {checkoutUrl}
            </div>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Test Checkout Page
            </a>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
