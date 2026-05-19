import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  label: string;
  amount: number;
}

export interface SolanaPaymentDetails {
  fromWallet: string;
  toWallet: string;
  signature: string;
  amountSOL: number;
  token: "SOL" | "USDC" | "USDT" | string;
  timestamp: number;
  network?: "mainnet-beta" | "devnet" | "testnet";
  slot?: number;
}

export interface SubscriptionReceiptItem {
  label: string;
  amount: number;
  frequency: string;
  status: string;
  policyId: number;
  nextPaymentDue: number | null;
}

export interface PaymentReceiptItem {
  amount: number;
  token: string;
  timestamp: number;
  signature: string;
  fromWallet: string;
  toWallet: string;
  slot?: number;
  txUrl?: string;
}

export interface ReceiptProps {
  merchant: {
    name: string;
    address?: string;
    phone?: string;
  };
  items?: LineItem[];
  discount?: number;
  taxRate?: number;
  payment: SolanaPaymentDetails;
  subscriptions?: SubscriptionReceiptItem[];
  recentPayments?: PaymentReceiptItem[];
  onPrintComplete?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

const SOLSCAN_BASE = "https://solscan.io/tx";
function solscanUrl(sig: string, network: string = "mainnet-beta") {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${SOLSCAN_BASE}/${sig}${cluster}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrinterBody() {
  return (
    <div className="relative flex items-center justify-center gap-2.5 w-[400px] h-14 rounded-t-xl rounded-b-sm bg-neutral-100 border border-neutral-200 z-10 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-[blink_1.8s_ease-in-out_infinite]" />
      <span className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
        Receipt Printer
      </span>
      <span className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-[380px] h-[3px] bg-neutral-300 rounded-t" />
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  mono?: boolean;
  indent?: boolean;
}

function Row({ label, value, muted, bold, mono, indent }: RowProps) {
  return (
    <div
      className={`flex justify-between leading-[1.85] ${
        muted ? "text-neutral-400" : "text-neutral-800"
      } ${bold ? "font-bold text-[12px]" : "text-[11.5px]"} ${
        indent ? "pl-2" : ""
      }`}
    >
      <span>{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

function Divider({ double = false }: { double?: boolean }) {
  const char = double ? "=" : "-";
  return (
    <div className="text-center text-neutral-300 text-[11px] tracking-[0.04em] leading-[1.85]">
      {char.repeat(32)}
    </div>
  );
}

function Spacer() {
  return <div className="h-1.5" />;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[10px] text-purple-500 tracking-widest leading-[1.85] font-bold">
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "paid"
      ? "text-green-600"
      : status === "overdue"
      ? "text-red-500"
      : "text-neutral-400";
  return <span className={`${color} font-bold`}>{status.toUpperCase()}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentReceipt({
  merchant,
  items = [],
  discount = 0,
  taxRate = 0,
  payment,
  subscriptions,
  recentPayments,
  onPrintComplete,
}: ReceiptProps) {
  const useSubscriptions = subscriptions && subscriptions.length > 0;

  const subTotal = useSubscriptions
    ? subscriptions.reduce((s, sub) => s + sub.amount, 0)
    : items.reduce((s, i) => s + i.amount, 0);
  const tax = subTotal * taxRate;
  const total = subTotal + tax - discount;

  const network = payment.network ?? "mainnet-beta";
  const txUrl = solscanUrl(payment.signature, network);

  const paperRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => onPrintComplete?.(), 3600);
    return () => clearTimeout(timer);
  }, [key, onPrintComplete]);

  function replay() {
    setKey((k) => k + 1);
  }

  return (
    <div
      key={key}
      className="flex flex-col items-center py-8 gap-0 select-none"
    >
      <PrinterBody />

      <div className="w-[375px] overflow-hidden relative z-[5]">
        <motion.div
          ref={paperRef}
          className="receipt-paper relative w-[375px] bg-[#fafaf8] px-[18px] pt-[18px] pb-8 shadow-[0_8px_24px_rgba(0,0,0,0.12)] border-x border-[#e8e6e0] box-border"
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          transition={{
            duration: 2.2,
            delay: 0.5,
            ease: [0.22, 0.8, 0.36, 1],
          }}
        >
          <div ref={linesRef}>
            {/* ── Merchant header ── */}
            {
              <div className="text-center font-bold text-[15px] tracking-[0.08em] text-neutral-800 leading-[1.85]">
                {merchant.name}
              </div>
            }
            {merchant.address && (
              <div className="text-center text-[10.5px] text-neutral-400 leading-[1.85]">
                {merchant.address}
              </div>
            )}
            {merchant.phone && (
              <div className="text-center text-[10.5px] text-neutral-400 leading-[1.85]">
                Tel: {merchant.phone}
              </div>
            )}
            <Spacer />
            <Divider />

            {/* ── Subscriptions section ── */}
            {useSubscriptions ? (
              <>
                {<SectionHeader>◈ ACTIVE SUBSCRIPTIONS</SectionHeader>}
                {subscriptions.map((sub) => (
                  <React.Fragment key={`sub-${sub.policyId}`}>
                    {
                      <Row
                        label={sub.label}
                        value={`${sub.amount.toFixed(2)} ${payment.token}`}
                      />
                    }
                    {
                      <div className="flex justify-between text-[10px] text-neutral-400 leading-[1.5] pl-2">
                        <span>
                          Policy #{sub.policyId} ·{" "}
                          <StatusBadge status={sub.status} />
                        </span>
                        <span>
                          {sub.nextPaymentDue
                            ? `Next: ${formatShortDate(
                                sub.nextPaymentDue * 1000
                              )}`
                            : sub.frequency}
                        </span>
                      </div>
                    }
                  </React.Fragment>
                ))}
              </>
            ) : (
              items.map((item) => (
                <Row label={item.label} value={`$${item.amount.toFixed(2)}`} />
              ))
            )}
            <Divider />
            {<Row label="Subtotal" value={`$${subTotal.toFixed(2)}`} muted />}
            {taxRate > 0 && (
              <Row
                label={`Tax (${(taxRate * 100).toFixed(1)}%)`}
                value={`$${tax.toFixed(2)}`}
                muted
              />
            )}
            {discount > 0 && (
              <Row label="Discount" value={`-$${discount.toFixed(2)}`} muted />
            )}
            <Divider double />
            <Row label="TOTAL" value={`$${total.toFixed(2)}`} bold />
            <Divider double />

            {/* ── Recent Payments section ── */}
            {recentPayments && recentPayments.length > 0 && (
              <>
                <SectionHeader>◈ PAYMENT HISTORY</SectionHeader>
                {recentPayments.map((p, i) => (
                  <React.Fragment key={`pay-${i}`}>
                    <Row
                      label={`${p.amount.toFixed(2)} ${p.token}`}
                      value={formatShortDate(p.timestamp)}
                    />
                    <div className="pl-2">
                      {p.txUrl ? (
                        <a
                          href={p.txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[9.5px] text-purple-400 break-all leading-[1.5] hover:text-purple-600 transition-colors"
                        >
                          {p.signature}
                        </a>
                      ) : (
                        <span className="block text-[9.5px] text-neutral-400 break-all leading-[1.5] font-mono">
                          {p.signature}
                        </span>
                      )}
                    </div>
                    <Row label="From" value={p.fromWallet} muted mono indent />
                    <Row label="To" value={p.toWallet} muted mono indent />
                  </React.Fragment>
                ))}
                {<Divider />}
              </>
            )}

            {/* ── On-chain verification block ── */}
            <SectionHeader>◎ PAYMENTS</SectionHeader>

            <Row
              label={`${payment.token} amount`}
              value={`${payment.amountSOL} ${payment.token}`}
              muted
            />
            <Row label="From" value={payment.fromWallet} muted mono />
            <Row label="To" value={payment.toWallet} muted mono />
            <Row label="Network" value={network} muted />

            <Row label="Date" value={formatDate(payment.timestamp)} muted />
            <div className="text-[10.5px] text-neutral-400 leading-[1.85]">
              Sig:
            </div>
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[9.5px] text-purple-400 break-all leading-[1.5] hover:text-purple-600 transition-colors"
            >
              {payment.signature}
            </a>
            <Spacer />
            <div className="text-center">
              <div className="text-[22px] block mb-0.5">✓</div>
              <div className="text-[11px] font-bold tracking-[0.05em] text-green-700">
                PAYMENT APPROVED
              </div>
            </div>
            <Spacer />

            <div className="text-center text-[10.5px] text-neutral-400 leading-[1.85]">
              Thank you for your purchase!
            </div>
          </div>
        </motion.div>
      </div>

      <button
        onClick={replay}
        className="mt-6 text-[12px] text-neutral-400 border border-neutral-200 rounded-full px-4 py-1.5 tracking-[0.05em] hover:text-neutral-700 hover:border-neutral-400 transition-colors cursor-pointer bg-transparent"
      >
        ↺ replay
      </button>
    </div>
  );
}
