"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const lineItems = [
  {
    id: 1,
    name: "Pro Plan",
    description: "Monthly subscription",
    price: 29.0,
    quantity: 1,
  },
  {
    id: 2,
    name: "Additional Team Seats",
    description: "5 extra seats × $4.00/seat",
    price: 20.0,
    quantity: 1,
  },
  {
    id: 3,
    name: "Priority Support",
    description: "24/7 dedicated support",
    price: 0.0,
    quantity: 1,
    included: true,
  },
];

export function OrderSummary() {
  const [isExpanded, setIsExpanded] = useState(true);

  const subtotal = lineItems.reduce((acc, item) => acc + item.price, 0);
  const tax = subtotal * 0.0;
  const total = subtotal + tax;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-card-foreground">
              Order Summary
            </h3>
            <p className="text-sm text-muted-foreground">
              {lineItems.length} items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-card-foreground">
            ${total.toFixed(2)}/mo
          </span>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-5 space-y-4">
          {/* Line items */}
          <div className="space-y-3 pt-2 border-t border-border">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between py-2"
              >
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">
                    {item.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="text-right ml-4">
                  {item.included ? (
                    <span className="text-sm font-medium text-primary">
                      Included
                    </span>
                  ) : (
                    <span className="font-medium text-card-foreground">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-card-foreground">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-card-foreground">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-card-foreground">
                Total due today
              </span>
              <span className="font-semibold text-lg text-card-foreground">
                ${total.toFixed(2)}/mo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
