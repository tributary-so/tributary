import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { Button } from "@heroui/button";
import { useCreateUpTo, CreateUpToResult } from "../";
import { Loader2 } from "lucide-react";

export interface UpToButtonProps {
  /** Ceiling on the settlement amount (smallest token units). */
  maxAmount: BN;
  /** Mandatory hard expiry (seconds). MUST be > 0 and > validAfter. */
  deadline: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  /** Earliest settlement (seconds). Omit / null / <=0 = immediate. */
  validAfter?: BN | null;
  memo?: string;
  approvalAmount?: BN;
  label?: string;
  className?: string;
  disabled?: boolean;
  radius?: "none" | "sm" | "md" | "lg" | "full" | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  onSuccess?: (result: CreateUpToResult) => void;
  onError?: (error: Error) => void;
}

export function UpToButton({
  maxAmount,
  deadline,
  token,
  recipient,
  gateway,
  validAfter,
  memo,
  approvalAmount,
  label = "Create Up-to",
  className = "",
  disabled = false,
  radius = "none",
  size = "lg",
  onSuccess,
  onError,
}: UpToButtonProps) {
  const { createUpTo, loading } = useCreateUpTo();

  const handleClick = async () => {
    try {
      const result = await createUpTo({
        maxAmount,
        deadline,
        token,
        recipient,
        gateway,
        validAfter,
        memo,
        approvalAmount,
      });
      onSuccess?.(result);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error("Unknown error"));
    }
  };

  const isDisabled = disabled || loading;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        radius={radius}
        size={size}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {loading ? "Creating Up-to..." : label}
      </Button>
    </div>
  );
}
