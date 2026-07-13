import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useCreateOneTime, CreateOneTimeResult } from "../";
import {
  buttonClass,
  SPINNER_SVG,
  type ButtonRadius,
  type ButtonSize,
} from "./buttonStyles";

export interface OneTimeButtonProps {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  /** Earliest execution (seconds). Omit / null / <=0 = immediate. */
  dueDate?: BN | null;
  /** Hard expiry (seconds). Omit / null = never expires. */
  expiryDate?: BN | null;
  memo?: string;
  approvalAmount?: BN;
  label?: string;
  className?: string;
  disabled?: boolean;
  radius?: ButtonRadius;
  size?: ButtonSize;
  onSuccess?: (result: CreateOneTimeResult) => void;
  onError?: (error: Error) => void;
}

export function OneTimeButton({
  amount,
  token,
  recipient,
  gateway,
  dueDate,
  expiryDate,
  memo,
  approvalAmount,
  label = "Create One-time",
  className = "",
  disabled = false,
  radius = "none",
  size = "lg",
  onSuccess,
  onError,
}: OneTimeButtonProps) {
  const { createOneTime, loading } = useCreateOneTime();

  const handleClick = async () => {
    try {
      const result = await createOneTime({
        amount,
        token,
        recipient,
        gateway,
        dueDate,
        expiryDate,
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
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={buttonClass(className, radius, size)}
      >
        {loading && (
          <span
            dangerouslySetInnerHTML={{ __html: SPINNER_SVG }}
            className="inline-flex items-center"
          />
        )}
        {loading ? "Creating One-time..." : label}
      </button>
    </div>
  );
}
