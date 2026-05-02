// CREDITS: This file was taken from MIT Licensed
// https://github.com/berkayoztunc/orquestra/blob/main/packages/frontend/src/components/TwitterWall.tsx

import { ExternalLink } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";

interface Integration {
  name: string;
  description: string;
  founder: string;
  url: string;
  image: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Yumi Finance",
    description: "Cash loans with automatic repayments on Solana.",
    founder: "Vladislav Lenskii",
    url: "https://yumifinance.io",
    image: "testimony/yumi-finance.png",
  },
  {
    name: "Allowly",
    description: "Subscription-oriented recurring payment use case.",
    founder: "Dr.-Ing. Fabian Schuh",
    url: "https://contribute.so",
    image: "testimony/contributeso.png",
  },
  {
    name: "Contribute.so",
    description: "Recurring crypto donations for GitHub developers.",
    founder: "Dr.-Ing. Fabian Schuh",
    url: "https://contribute.so",
    image: "testimony/contributeso.png",
  },
];

// Repeat enough times to fill wide screens seamlessly (2 copies for loop)
const TRACK_ITEMS = [...Array(2)].flatMap(() => INTEGRATIONS);

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <a
      key={integration.name}
      href={integration.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 w-120 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/25 hover:bg-muted/30 transition-all duration-300"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <img
            src={integration.image}
            alt={integration.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-bold text-xl group-hover:text-primary transition-colors">
              {integration.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {integration.founder}
            </p>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-sm text-muted-foreground">
          {integration.description}
        </p>
      </div>
    </a>
  );
}

export default function IntegrationsWall() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const el = containerRef.current;
    if (el && !isPaused.current) {
      el.scrollLeft += 1;
      // Seamless loop: reset when first half is consumed
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  function onMouseEnter() {
    isPaused.current = true;
  }
  function onMouseLeave() {
    isPaused.current = false;
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  }
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    isDragging.current = true;
    startX.current = e.pageX - (containerRef.current?.offsetLeft ?? 0);
    startScrollLeft.current = containerRef.current?.scrollLeft ?? 0;
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
  }
  function onMouseUp() {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const el = containerRef.current;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    let next = startScrollLeft.current - walk;
    const half = el.scrollWidth / 2;
    // Keep within seamless bounds
    if (next < 0) next += half;
    if (next >= half) next -= half;
    el.scrollLeft = next;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to right, var(--color-background), transparent)",
        }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to left, var(--color-background), transparent)",
        }}
      />

      {/* Scrollable track */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-scroll pb-1 cursor-grab select-none"
        style={{ scrollbarWidth: "none" }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        {/* First copy */}
        {TRACK_ITEMS.map((integration, i) => (
          <IntegrationCard
            key={`a-${integration.url}-${i}`}
            integration={integration}
          />
        ))}
        {/* Duplicate for seamless loop */}
        {TRACK_ITEMS.map((integration, i) => (
          <IntegrationCard
            key={`b-${integration.url}-${i}`}
            integration={integration}
          />
        ))}
      </div>
    </div>
  );
}
