import React from "react";
import { SubscriptionButton } from "./components/SubscriptionButton";
import { PaymentInterval } from "./types";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { SubscriptionButtonWithCode } from "./components/SubscriptionWithCodeButton";

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
} as const;

const SubscriptionButtonExample: React.FC = () => {
  const { connected } = useWallet();

  const handleSuccess = (result: any) => {
    console.log("Subscription created successfully:", result);
    alert("Subscription created! Check console for details.");
  };

  const handleError = (error: Error) => {
    console.error("Subscription creation failed:", error);
    alert(`Error: ${error.message}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="w-full bg-white shadow-md p-4 flex justify-end items-center">
        <WalletMultiButton />
      </nav>
      <div className="flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Tributary Subscription Example
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Experience seamless recurring payments on Solana.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Monthly Pro Plan
            </h3>
            <p className="text-gray-600 mb-6">
              Get unlimited access to all features for a low monthly price.
              Cancel anytime.
            </p>
            {connected ? (
              <div className="flex gap-6 justify-center">
                <SubscriptionButton
                  amount={DEFAULT_CONFIG.AMOUNT}
                  token={DEFAULT_CONFIG.TOKEN}
                  recipient={DEFAULT_CONFIG.RECIPIENT}
                  gateway={DEFAULT_CONFIG.GATEWAY}
                  interval={PaymentInterval.Monthly}
                  maxRenewals={12}
                  memo="Example subscription - Landing page demo"
                  approvalAmount={DEFAULT_CONFIG.APPROVAL_AMOUNT}
                  executeImmediately={true}
                  label="Subscribe for $0.001/month"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105"
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
                <SubscriptionButtonWithCode
                  amount={DEFAULT_CONFIG.AMOUNT}
                  token={DEFAULT_CONFIG.TOKEN}
                  gateway={DEFAULT_CONFIG.GATEWAY}
                  interval={PaymentInterval.Monthly}
                  maxRenewals={12}
                  memo="Example subscription - Landing page demo"
                  approvalAmount={DEFAULT_CONFIG.APPROVAL_AMOUNT}
                  executeImmediately={true}
                  label="ActionCode for $0.001/month"
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </div>
            ) : (
              <WalletMultiButton className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105" />
            )}
            <p className="mt-4 text-xs text-gray-500">
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
