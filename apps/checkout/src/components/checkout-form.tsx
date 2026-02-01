"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Mail, User } from "lucide-react";

export function CheckoutForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate payment processing
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Contact information
        </h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-medium text-foreground"
            >
              Full name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Payment details
        </h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label
              htmlFor="card"
              className="text-sm font-medium text-foreground"
            >
              Card number
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="card"
                type="text"
                placeholder="1234 1234 1234 1234"
                className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <div className="w-8 h-5 bg-muted rounded flex items-center justify-center">
                  <svg className="w-6 h-4" viewBox="0 0 24 16" fill="none">
                    <rect width="24" height="16" rx="2" fill="#1A1F71" />
                    <path d="M9.5 10.5L10.5 5.5H12L11 10.5H9.5Z" fill="white" />
                    <path d="M15 5.5L13.5 10.5H12L13.5 5.5H15Z" fill="white" />
                  </svg>
                </div>
                <div className="w-8 h-5 bg-muted rounded flex items-center justify-center">
                  <svg className="w-6 h-4" viewBox="0 0 24 16" fill="none">
                    <rect width="24" height="16" rx="2" fill="#EB001B" />
                    <circle cx="9" cy="8" r="5" fill="#EB001B" />
                    <circle cx="15" cy="8" r="5" fill="#F79E1B" />
                    <path
                      d="M12 4.5C13.1 5.4 13.8 6.6 13.8 8C13.8 9.4 13.1 10.6 12 11.5C10.9 10.6 10.2 9.4 10.2 8C10.2 6.6 10.9 5.4 12 4.5Z"
                      fill="#FF5F00"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="expiry"
                className="text-sm font-medium text-foreground"
              >
                Expiry date
              </Label>
              <Input
                id="expiry"
                type="text"
                placeholder="MM / YY"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="cvc"
                className="text-sm font-medium text-foreground"
              >
                CVC
              </Label>
              <Input
                id="cvc"
                type="text"
                placeholder="123"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Billing address
        </h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label
              htmlFor="country"
              className="text-sm font-medium text-foreground"
            >
              Country
            </Label>
            <select
              id="country"
              className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue="US"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="AU">Australia</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="zip"
                className="text-sm font-medium text-foreground"
              >
                ZIP / Postal code
              </Label>
              <Input
                id="zip"
                type="text"
                placeholder="12345"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="state"
                className="text-sm font-medium text-foreground"
              >
                State
              </Label>
              <Input
                id="state"
                type="text"
                placeholder="California"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">Subscribe now</span>
        )}
      </Button>

      {/* Security notice */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Secured by 256-bit SSL encryption</span>
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground leading-relaxed">
        By subscribing, you agree to our{" "}
        <a href="#" className="text-primary hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="text-primary hover:underline">
          Privacy Policy
        </a>
        . Your subscription will automatically renew monthly until you cancel.
      </p>
    </form>
  );
}
