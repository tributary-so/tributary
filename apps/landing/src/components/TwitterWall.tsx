// CREDITS: This file was taken from MIT Licensed
// https://github.com/berkayoztunc/orquestra/blob/main/packages/frontend/src/components/TwitterWall.tsx

import { useRef, useEffect, useCallback } from "react";

interface Tweet {
  id: string;
  author: string;
  handle: string;
  text: string;
  date: string;
  url: string;
}

// Add more tweets here as you collect them
const TWEETS: Tweet[] = [
  {
    id: "2049758492064395743",
    author: "Vlad (Moving Atoms arc)",
    handle: "CosmicDude3000",
    text: ". @tributaryso and @xer0c should be there!",
    date: "Mar 30, 2026",
    url: "https://x.com/CosmicDude3000/status/2049758492064395743",
  },
  {
    id: "2050647741039272212",
    author: "Harshit",
    handle: "Harshitaturs",
    text: "NOW THAT'S SOME INTERSTING STUFF!!",
    date: "May 2, 2026",
    url: "https://x.com/Harshitaturs/status/2050647741039272212",
  },
  {
    id: "2047557841481851266",
    author: "rok420.eth",
    handle: "Grok420",
    text: "Great… the raise on vibes + whitepaper era is cooked anyway. Real products only now 😎",
    date: "Apr 24, 2026",
    url: "https://x.com/Grok420/status/2047557841481851266",
  },
  // {
  //   id: "2047297038262652929",
  //   author: "Vlad (Moving Atoms arc)",
  //   handle: "CosmicDude3000",
  //   text: "payments infrastructure punishes shallow understanding 🤝",
  //   date: "Apr 23, 2026",
  //   url: "https://x.com/CosmicDude3000/status/2047297038262652929",
  // },
  {
    id: "2046533288752235003",
    author: "Iko",
    handle: "ikothedesigner",
    text: "Nice done....",
    date: "Apr 21, 2026",
    url: "https://x.com/ikothedesigner/status/2046533288752235003",
  },
  {
    id: "2046556179162431504",
    author: "Vlad (Moving Atoms arc)",
    handle: "CosmicDude3000",
    text: "Imagine programmable subscriptions 😎",
    date: "Apr 21, 2026",
    url: "https://x.com/CosmicDude3000/status/2046556179162431504",
  },
  {
    id: "2046341006577287607",
    author: "milian",
    handle: "milianstx",
    text: "really cool! been waiting for something like this. ...",
    date: "Apr 20, 2026",
    url: "https://x.com/milianstx/status/2046341006577287607",
  },
  {
    id: "2044810256304242812",
    author: "Happy Pirate | Triton.One",
    handle: "SteveCleanBrook",
    text: "Ganz Toll, oberaffengeil.",
    date: "Apr 16, 2026",
    url: "https://x.com/SteveCleanBrook/status/2044810256304242812",
  },
  {
    id: "2052749629071016115",
    author: "Jonas Hahn",
    handle: "SolPlay_jonas",
    text: "The legend :D",
    date: "May 8, 2026",
    url: "https://x.com/SolPlay_jonas/status/2052749629071016115",
  },
  {
    id: "2052747622339809431",
    author: "High Tower",
    handle: "htwtech_",
    text: "this changes everything no more clunky payment rails solana’s hitting different now",
    date: "May 8, 2026",
    url: "https://x.com/htwtech_/status/2052747622339809431",
  },
  {
    id: "2052744078299947110",
    author: "Avii",
    handle: "AviiWeb3",
    text: "this is slick as hell",
    date: "May 8, 2026",
    url: "https://x.com/AviiWeb3/status/2052744078299947110",
  },
];

// Repeat enough times to fill wide screens seamlessly (2 copies for loop)
const TRACK_ITEMS = [...Array(2)].flatMap(() => TWEETS);

const MAX_CHARS = 140;
function truncate(text: string): string {
  return text.length <= MAX_CHARS
    ? text
    : text.slice(0, MAX_CHARS).trimEnd() + "…";
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.727-8.826L1.667 2.25H8.32l4.259 5.637L18.244 2.25zM17.083 19.77h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 w-80 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/25 hover:bg-muted/30 transition-all duration-300"
    >
      {/* Author row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={`https://unavatar.io/twitter/${tweet.handle}`}
            alt={tweet.author}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover bg-muted flex-shrink-0"
            onError={(e) => {
              (
                e.currentTarget as HTMLImageElement
              ).src = `https://api.dicebear.com/7.x/initials/svg?seed=${tweet.handle}&backgroundColor=14F195&textColor=0a0f0d`;
            }}
          />
          <div className="min-w-0">
            <p className="text-foreground text-sm font-semibold leading-tight truncate">
              {tweet.author}
            </p>
            <p className="text-muted-foreground text-xs truncate">
              @{tweet.handle}
            </p>
          </div>
        </div>
        <XLogo className="w-[18px] h-[18px] text-muted-foreground group-hover:text-[#1d9bf0] transition-colors flex-shrink-0 ml-2" />
      </div>

      {/* Tweet text */}
      <p className="text-foreground/80 text-sm leading-relaxed flex-1">
        {truncate(tweet.text)}
      </p>

      {/* Date */}
      <p className="text-muted-foreground text-xs">{tweet.date}</p>
    </a>
  );
}

export default function TwitterWall() {
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
        {TRACK_ITEMS.map((tweet, i) => (
          <TweetCard key={`a-${tweet.id}-${i}`} tweet={tweet} />
        ))}
        {/* Duplicate for seamless loop */}
        {TRACK_ITEMS.map((tweet, i) => (
          <TweetCard key={`b-${tweet.id}-${i}`} tweet={tweet} />
        ))}
      </div>
    </div>
  );
}
