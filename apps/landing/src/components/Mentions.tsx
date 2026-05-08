interface Mention {
  url: string;
  src: string;
  alt: string;
  width?: number;
}

const MENTIONS: Mention[] = [
  {
    url: "https://www.uneed.best/tool/tributary",
    src: "https://www.uneed.best/EMBED3B.png",
    alt: "Featured on Uneed",
  },
  {
    url: "https://fazier.com/launches/tributary.so",
    src: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=neutral",
    alt: "Launched on Fazier",
    width: 120,
  },
  {
    url: "https://www.foundrlist.com/product/tributary?utm_source=badge&utm_medium=embed",
    src: "https://www.foundrlist.com/api/badge/tributary",
    alt: "Featured on FoundrList",
    width: 150,
  },
  {
    url: "https://devhunt.org/tool/tributary",
    src: "/devhunt.svg",
    alt: "Featured on Devhunt",
    width: 800,
  },
];

function TinyStartupsBadge() {
  return (
    <a
      href="https://www.tinystartups.com/startup/tributary"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-transform hover:scale-105 gap-2 px-3 py-1 rounded-lg"
      style={{
        textDecoration: "none",
        fontFamily: "Inter, system-ui, sans-serif",
        background:
          "linear-gradient(#fff,#fff) padding-box, linear-gradient(90deg, #3525E6, #D81FE0, #22B8F0) border-box",
        color: "#0E0B1F",
      }}
    >
      <svg viewBox="0 0 100 100" className="h-8 w-8">
        <defs>
          <linearGradient id="tsg" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#3525E6" />
            <stop offset="55%" stopColor="#D81FE0" />
            <stop offset="100%" stopColor="#22B8F0" />
          </linearGradient>
        </defs>
        <path
          d="M50 6C52 32 68 48 94 50C68 52 52 68 50 94C48 68 32 52 6 50C32 48 48 32 50 6Z"
          fill="url(#tsg)"
        />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[7px] font-semibold tracking-[0.15em] uppercase text-[#6A6585]">
          Launched on
        </span>
        <span className="text-sm font-extrabold tracking-tight leading-none">
          Tiny Startups
        </span>
      </span>
    </a>
  );
}

export default function Mentions() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 grayscale opacity-60 hover:grayscale-0 hover:opacity-90 transition-all duration-300 [&>a]:h-10 [&>a]:flex [&>a]:items-center [&_img]:h-10 [&_img]:w-auto [&_img]:object-contain [&_svg]:h-10 [&_svg]:w-auto">
      {MENTIONS.map((mention) => (
        <a
          key={mention.url}
          href={mention.url}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform hover:scale-105"
        >
          <img src={mention.src} alt={mention.alt} width={mention.width} />
        </a>
      ))}
      <TinyStartupsBadge />
    </div>
  );
}
