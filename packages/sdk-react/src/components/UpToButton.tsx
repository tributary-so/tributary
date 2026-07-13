import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useCreateUpTo, CreateUpToResult } from "../";
import {
  buttonClass,
  SPINNER_SVG,
  type ButtonRadius,
  type ButtonSize,
} from "./buttonStyles";

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
  radius?: ButtonRadius;
  size?: ButtonSize;
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
        {loading ? "Creating Up-to..." : label}
      </button>
    </div>
  );
}
