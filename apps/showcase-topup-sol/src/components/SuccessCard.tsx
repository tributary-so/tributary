import { useEffect, useRef } from "react";
import { ExplorerLink } from "@tributary-so/ui/solana";

/**
 * Success state — success-check appear transition (fade + rotate + blur + Y-bob
 * + path draw) followed by the transaction + policy PDA links. The check
 * replays on mount.
 */
export function SuccessCard({
  signature,
  policyPda,
}: {
  signature: string;
  policyPda: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Calibrate stroke-draw length for this path, then play the appear.
    const path = pathRef.current;
    if (path) {
      const len = Math.ceil(path.getTotalLength());
      path.style.setProperty("--check-len", String(len));
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    }
    const wrap = wrapRef.current;
    if (wrap) {
      wrap.setAttribute("data-state", "out");
      void wrap.offsetWidth;
      wrap.setAttribute("data-state", "in");
    }
  }, []);

  return (
    <div className="border border-border p-8 text-center">
      <span
        ref={wrapRef}
        className="t-success-check mx-auto"
        data-state="out"
        aria-hidden="true"
      >
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
          <circle
            cx="24"
            cy="24"
            r="21"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          <path
            ref={pathRef}
            d="M15 24.5L21.5 31L34 17"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <h2 className="text-xl font-bold tracking-tight mt-4">Policy created</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-[44ch] mx-auto">
        The composable top-up policy is live. A gateway signer can now execute
        it whenever the hot wallet's SOL drops below your threshold.
      </p>
      <div className="mt-5 space-y-1 text-xs font-mono">
        <div>
          <span className="text-muted-foreground">tx: </span>
          <ExplorerLink
            path={`tx/${signature}`}
            label={`${signature.slice(0, 8)}…${signature.slice(-6)}`}
          />
        </div>
        <div>
          <span className="text-muted-foreground">policy: </span>
          <ExplorerLink
            path={`account/${policyPda}`}
            label={`${policyPda.slice(0, 8)}…${policyPda.slice(-6)}`}
          />
        </div>
      </div>
    </div>
  );
}
