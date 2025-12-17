import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { Button } from "@heroui/button";
import { useCreateMilestone, CreateMilestoneResult } from "../";
import { Loader2 } from "lucide-react";

export interface MilestoneButtonProps {
  milestoneAmounts: BN[];
  milestoneTimestamps: BN[];
  releaseCondition: number; // 0=time-based, 1=manual approval, 2=automatic
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  approvalAmount?: BN;
  executeImmediately?: boolean;
  label?: string;
  className?: string;
  disabled?: boolean;
  radius?: "none" | "sm" | "md" | "lg" | "full" | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  onSuccess?: (result: CreateMilestoneResult) => void;
  onError?: (error: Error) => void;
}

export function MilestoneButton({
  milestoneAmounts,
  milestoneTimestamps,
  releaseCondition,
  token,
  recipient,
  gateway,
  memo,
  approvalAmount,
  executeImmediately = true,
  label = "Create Milestone Payment",
  className = "",
  disabled = false,
  radius = "none",
  size = "lg",
  onSuccess,
  onError,
}: MilestoneButtonProps) {
  const { createMilestone, loading } = useCreateMilestone();

  const handleClick = async () => {
    try {
      const result = await createMilestone({
        milestoneAmounts,
        milestoneTimestamps,
        releaseCondition,
        token,
        recipient,
        gateway,
        memo,
        approvalAmount,
        executeImmediately,
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
        {loading ? "Creating Milestone Payment..." : label}
      </Button>
    </div>
  );
}
