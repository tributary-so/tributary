import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { CreateSubscriptionResult } from "../";
import { ArrowRight, InfoIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useActionCode } from "@/hooks/useActionCode";
import { SubscriptionButtonProps } from "./SubscriptionButton";

export interface SubscriptionButtonWithCodeProps
  extends Omit<SubscriptionButtonProps, "recipient"> {
  onSuccess?: (result: CreateSubscriptionResult) => void;
  onError?: (error: Error) => void;
}

type Status =
  | "idle"
  | "input"
  | "resolving"
  | "check_wallet"
  | "success"
  | "error";

export function SubscriptionButtonWithCode({
  amount,
  token,
  // recipient,
  gateway,
  interval,
  custom_interval,
  maxRenewals,
  memo,
  startTime,
  approvalAmount,
  //executeImmediately = true,
  label = "Subscribe",
  className = "",
  disabled = false,
  radius = "none",
  size = "lg",
  onSuccess = () => {},
  onError = () => {},
}: SubscriptionButtonWithCodeProps) {
  const { resolveActionCode, submitTransaction, clearActionCode } =
    useActionCode();
  const [status, setStatus] = useState<Status>("idle");
  const [inputValue, setInputValue] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Reset to idle after 5 seconds when success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setInputValue("");
        clearActionCode();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, clearActionCode]);

  const handleInitialClick = () => {
    setStatus("input");
  };

  const handleTryAgain = () => {
    setStatus("input");
    setInputValue("");
    clearActionCode();
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      return;
    }

    setStatus("resolving");

    try {
      const result = await resolveActionCode(inputValue.trim());

      if (result.success && result.pubkey) {
        setStatus("check_wallet");

        try {
          const txSig = await submitTransaction({
            amount,
            token,
            gateway,
            interval,
            custom_interval,
            maxRenewals,
            memo,
            startTime,
            approvalAmount,
            executeImmediately: false,
          });

          onSuccess({ txId: txSig.txSig, instructions: [] });
          setStatus("success");
        } catch (submitError) {
          console.error("Submit transaction error:", submitError);
          setStatus("error");
          onError(
            submitError instanceof Error
              ? submitError
              : new Error("Failed to submit transaction")
          );
        }
      } else {
        console.error("Component - Resolution failed:", result);
        setStatus("error");
        onError(new Error(result.error || "Failed to resolve action code"));
      }
    } catch (err) {
      setStatus("error");
      onError(err instanceof Error ? err : new Error("Unknown error"));
    }
  };

  const isDisabled =
    disabled || status === "resolving" || status === "check_wallet";
  const isLoading = status === "resolving" || status === "check_wallet";

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={handleInitialClick}
          disabled={isDisabled}
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className} w-[200px]`}
          radius={radius}
          size={size}
        >
          {label}
        </Button>
      </div>
    );
  }

  if (status === "input") {
    return (
      <div style={{ width: "200px" }}>
        <Input
          classNames={{
            base: "bg-none",
            inputWrapper: "px-1",
          }}
          fullWidth
          value={inputValue}
          onValueChange={setInputValue}
          placeholder="Action Code"
          className={`${className}`}
          radius={radius}
          size={size}
          startContent={
            <Popover
              style={{ maxWidth: "200px" }}
              placement="bottom-start"
              showArrow={true}
              isOpen={popoverOpen}
              onOpenChange={(open) => setPopoverOpen(open)}
            >
              <PopoverTrigger>
                <Button size="sm" radius={radius} isIconOnly variant="light">
                  <InfoIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="px-1 py-2">
                  <div className="text-small font-bold">
                    Where to get a Code?
                  </div>
                  <div className="text-tiny">
                    Visit{" "}
                    <a
                      href="https://actioncode.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      actioncode.app
                    </a>{" "}
                    in your wallet browser to get one-time Action Code.
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          }
          endContent={
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              size="sm"
              radius={radius}
              isIconOnly
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim()) {
              handleSubmit();
            }
          }}
        />
      </div>
    );
  }

  if (status === "resolving" || status === "check_wallet") {
    const buttonText =
      status === "resolving" ? "Processing..." : "Check your wallet";
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          disabled={true}
          isLoading={isLoading}
          style={{ width: "200px" }}
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          radius={radius}
          size={size}
        >
          {buttonText}
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <Button
        disabled={true}
        isLoading={isLoading}
        className={`${className}`}
        style={{ width: "200px" }}
        radius={radius}
        size={size}
        color="success"
        variant="flat"
      >
        Success
      </Button>
    );
  }

  if (status === "error") {
    return (
      <Button
        onClick={handleTryAgain}
        className={`${className}`}
        style={{ width: "200px" }}
        radius={radius}
        size={size}
        color="default"
        variant="flat"
      >
        Invalid Code, Try Again
      </Button>
    );
  }

  return null;
}
