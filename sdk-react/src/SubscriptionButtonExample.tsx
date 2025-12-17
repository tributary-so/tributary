import React from "react";
import { SubscriptionButton } from "./components/SubscriptionButton";
import { MilestoneButton } from "./components/MilestoneButton";
import { PayAsYouGoButton } from "./components/PayAsYouGoButton";
import { SubscriptionButtonWithCode } from "./components/SubscriptionWithCodeButton";
import { PaymentInterval } from "./types";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

// Default configuration constants
const DEFAULT_CONFIG = {
  // USDC token mint (mainnet)
  TOKEN: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  // USDC on devnet
  // TOKEN: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  // Example recipient (replace with actual recipient)
  RECIPIENT: new PublicKey("8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1"),
  // Example gateway (replace with actual gateway)
  GATEWAY: new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"),
  // Amount: 10 USDC (6 decimals)
  AMOUNT: new BN(1_000),
  // Approval amount: 120 USDC for 12 months
  APPROVAL_AMOUNT: new BN(120_000_000),
  // Milestone amounts: 25, 25, 25, 25 USDC
  MILESTONE_AMOUNTS: [
    new BN(25_000_000),
    new BN(25_000_000),
    new BN(25_000_000),
    new BN(25_000_000),
  ],
  // Milestone timestamps (relative to now, in seconds since epoch)
  MILESTONE_TIMESTAMPS: [
    new BN(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60), // 1 week from now
    new BN(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60), // 2 weeks from now
    new BN(Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60), // 3 weeks from now
    new BN(Math.floor(Date.now() / 1000) + 28 * 24 * 60 * 60), // 4 weeks from now
  ],
  // Pay-as-you-go: max 100 USDC per month, 10 USDC per chunk
  MAX_AMOUNT_PER_PERIOD: new BN(100_000_000),
  MAX_CHUNK_AMOUNT: new BN(10_000_000),
  PERIOD_LENGTH_SECONDS: new BN(30 * 24 * 60 * 60), // 30 days
};

const SubscriptionButtonExample: React.FC = () => {
  const { connected } = useWallet();

  const handleSuccess = (result: any, type: string) => {
    console.log(`${type} created successfully:`, result);
    alert(`${type} created! Check console for details.`);
  };

  const handleError = (error: Error, type: string) => {
    console.error(`${type} creation failed:`, error);
    alert(`Error: ${error.message}`);
  };

  const subscriptionSuccess = (result: any) =>
    handleSuccess(result, "Subscription");
  const subscriptionError = (error: Error) =>
    handleError(error, "Subscription");
  const milestoneSuccess = (result: any) =>
    handleSuccess(result, "Milestone Payment");
  const milestoneError = (error: Error) =>
    handleError(error, "Milestone Payment");
  const payAsYouGoSuccess = (result: any) =>
    handleSuccess(result, "Pay-as-you-go");
  const payAsYouGoError = (error: Error) => handleError(error, "Pay-as-you-go");
  const codeSuccess = (result: any) =>
    handleSuccess(result, "ActionCode Subscription");
  const codeError = (error: Error) =>
    handleError(error, "ActionCode Subscription");

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <nav className="w-full bg-white shadow-md p-4 flex justify-end items-center">
        <WalletMultiButton />
      </nav>

      <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Tributary Payment Examples
            </h2>
            <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
              Experience all payment types: subscriptions, milestone payments,
              and pay-as-you-go billing. Non-custodial, automated recurring
              payments on Solana.
            </p>
          </div>

          {!connected ? (
            <div className="text-center mb-16">
              <div className="bg-white p-12 rounded-2xl shadow-lg border border-neutral-200 max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                  Connect Your Wallet
                </h3>
                <p className="text-neutral-600 mb-8">
                  Connect your Solana wallet to explore all payment types and
                  see how Tributary works.
                </p>
                <WalletMultiButton className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105" />
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Subscription Card */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200 hover:shadow-xl transition-shadow duration-300">
                <div className="text-6xl mb-6 text-center">🔄</div>
                <h3 className="text-2xl font-bold mb-4 text-neutral-900 text-center">
                  Subscription
                </h3>
                <p className="text-lg font-semibold text-blue-600 mb-6 text-center">
                  Predictable recurring payments on autopilot
                </p>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  Set it and forget it. Fixed payments automatically charge at
                  regular intervals—daily, weekly, monthly, or custom schedules.
                  Perfect for services with consistent pricing.
                </p>
                <div className="mb-6">
                  <h4 className="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wide">
                    Example: Monthly Pro Plan
                  </h4>
                  <ul className="space-y-2 text-neutral-700 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>$0.001 per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Auto-renew for 12 months</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Cancel anytime</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <SubscriptionButton
                    amount={DEFAULT_CONFIG.AMOUNT}
                    token={DEFAULT_CONFIG.TOKEN}
                    recipient={DEFAULT_CONFIG.RECIPIENT}
                    gateway={DEFAULT_CONFIG.GATEWAY}
                    interval={PaymentInterval.Monthly}
                    maxRenewals={12}
                    memo="Example subscription - SDK React demo"
                    approvalAmount={DEFAULT_CONFIG.APPROVAL_AMOUNT}
                    executeImmediately={true}
                    label="Subscribe Monthly"
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105"
                    onSuccess={subscriptionSuccess}
                    onError={subscriptionError}
                  />
                  <SubscriptionButtonWithCode
                    amount={DEFAULT_CONFIG.AMOUNT}
                    token={DEFAULT_CONFIG.TOKEN}
                    gateway={DEFAULT_CONFIG.GATEWAY}
                    interval={PaymentInterval.Monthly}
                    maxRenewals={12}
                    memo="Example subscription - SDK React demo"
                    approvalAmount={DEFAULT_CONFIG.APPROVAL_AMOUNT}
                    executeImmediately={true}
                    label="ActionCode Subscription"
                    onSuccess={codeSuccess}
                    onError={codeError}
                  />
                </div>
              </div>

              {/* Milestone Payment Card */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200 hover:shadow-xl transition-shadow duration-300">
                <div className="text-6xl mb-6 text-center">🎯</div>
                <h3 className="text-2xl font-bold mb-4 text-neutral-900 text-center">
                  Milestone Payments
                </h3>
                <p className="text-lg font-semibold text-blue-600 mb-6 text-center">
                  Pay as work gets done, not by the clock
                </p>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  Break projects into up to 4 milestones with custom amounts and
                  release conditions. Payments unlock when deliverables are
                  complete—time-based, manual approval, or automatic.
                </p>
                <div className="mb-6">
                  <h4 className="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wide">
                    Example: 4-Week Project
                  </h4>
                  <ul className="space-y-2 text-neutral-700 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>4 milestones of $25 each</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Weekly releases</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Time-based automation</span>
                    </li>
                  </ul>
                </div>
                <MilestoneButton
                  milestoneAmounts={DEFAULT_CONFIG.MILESTONE_AMOUNTS}
                  milestoneTimestamps={DEFAULT_CONFIG.MILESTONE_TIMESTAMPS}
                  releaseCondition={0} // time-based
                  token={DEFAULT_CONFIG.TOKEN}
                  recipient={DEFAULT_CONFIG.RECIPIENT}
                  gateway={DEFAULT_CONFIG.GATEWAY}
                  memo="Example milestone payment - SDK React demo"
                  approvalAmount={new BN(100_000_000)} // 100 USDC approval
                  executeImmediately={true}
                  label="Create Milestone Plan"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105"
                  onSuccess={milestoneSuccess}
                  onError={milestoneError}
                />
              </div>

              {/* Pay-as-you-go Card */}
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-neutral-200 hover:shadow-xl transition-shadow duration-300">
                <div className="text-6xl mb-6 text-center">📈</div>
                <h3 className="text-2xl font-bold mb-4 text-neutral-900 text-center">
                  Pay-as-you-go
                </h3>
                <p className="text-lg font-semibold text-blue-600 mb-6 text-center">
                  Only pay for what you actually use
                </p>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  Usage-based billing with smart limits. Providers claim funds
                  as services are consumed, within your predefined budget.
                  Periods reset automatically—no surprises.
                </p>
                <div className="mb-6">
                  <h4 className="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wide">
                    Example: API Usage Plan
                  </h4>
                  <ul className="space-y-2 text-neutral-700 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>Max $100 per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>$10 per usage chunk</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>30-day reset period</span>
                    </li>
                  </ul>
                </div>
                <PayAsYouGoButton
                  maxAmountPerPeriod={DEFAULT_CONFIG.MAX_AMOUNT_PER_PERIOD}
                  maxChunkAmount={DEFAULT_CONFIG.MAX_CHUNK_AMOUNT}
                  periodLengthSeconds={DEFAULT_CONFIG.PERIOD_LENGTH_SECONDS}
                  token={DEFAULT_CONFIG.TOKEN}
                  recipient={DEFAULT_CONFIG.RECIPIENT}
                  gateway={DEFAULT_CONFIG.GATEWAY}
                  memo="Example pay-as-you-go - SDK React demo"
                  approvalAmount={new BN(120_000_000)} // 120 USDC approval
                  label="Setup Usage Billing"
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105"
                  onSuccess={payAsYouGoSuccess}
                  onError={payAsYouGoError}
                />
              </div>
            </div>
          )}

          <div className="mt-16 text-center">
            <p className="text-sm text-neutral-500">
              Powered by Tributary.so - Non-custodial recurring payments on
              Solana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionButtonExample;
