interface Mention {
  url: string;
  src: string;
  alt: string;
  width?: number;
}

type Endorser = {
  name: string;
  url: string;
  mark: React.ReactNode;
};

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
  {
    url: "https://peerpush.net/p/tributary",
    src: "https://peerpush.net/p/tributary/badge.png",
    alt: "Tributary on PeerPush",
    width: 230,
  },
];

function TinyStartupsBadge() {
  return (
    <a
      href="https://www.tinystartups.com/startup/tributary"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-transform hover:scale-105 gap-2 px-3 py-1 rounded-lg grayscale opacity-60 hover:grayscale-0 hover:opacity-90"
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

const endorsers: Endorser[] = [
  {
    name: "SuperteamDE",
    url: "https://x.com/SuperteamDE/status/2042135477218897995",
    mark: (
      <img
        width="16"
        height="20"
        aria-hidden="true"
        className="rounded-2xl"
        src="/superteamde.png"
      />
    ),
  },
  {
    name: "OwnershipFM",
    url: "https://x.com/ownershipfm/status/2045866066463584586",
    mark: (
      <img
        width="16"
        height="16"
        aria-hidden="true"
        className="rounded-4xl"
        src="/ownershipfm.jpg"
      />
    ),
  },
  {
    name: "Corbits",
    url: "https://x.com/corbitsdev/status/1999763496964383007",
    mark: (
      <img
        width="16"
        height="16"
        aria-hidden="true"
        className="rounded-2xl"
        src="/corbits.jpg"
      />
    ),
  },
  {
    name: "Adevar Labs",
    url: "https://x.com/SuperteamEarn/status/1994405867224178834",
    mark: (
      <img
        width="16"
        height="16"
        aria-hidden="true"
        className="rounded-2xl"
        src="/adevarlabs.jpg"
      />
    ),
  },
  {
    name: "Superteam Earn",
    url: "https://x.com/SuperteamEarn/status/1994405867224178834",
    mark: (
      <img
        width="16"
        height="16"
        aria-hidden="true"
        className="rounded-2xl"
        src="/superteamearn.jpg"
      />
    ),
  },
  {
    name: "Superteam",
    url: "https://x.com/SuperteamEarn/status/1994405927588684221",
    mark: (
      <img
        width="16"
        height="16"
        aria-hidden="true"
        className="rounded-2xl"
        src="/superteam.jpg"
      />
    ),
  },
  // {
  //   name: "Solana Foundation",
  //   url: "https://x.com/SolPlay_jonas/status/2052741790852165641",
  //   mark: (
  //     <img
  //       width="16"
  //       height="16"
  //       aria-hidden="true"
  //       src="/solanaLogoMark.svg"
  //     />
  //   ),
  // },
];

function Endorsements() {
  return (
    <ul
      className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5"
      role="list"
    >
      {endorsers.map((e) => (
        <li
          key={e.name}
          className="grayscale opacity-60 hover:grayscale-0 hover:opacity-90 transition-all duration-300 [&>a]:h-10 [&>a]:flex [&>a]:items-center [&_img]:h-10 [&_img]:w-auto [&_img]:object-contain [&_svg]:h-10 [&_svg]:w-auto"
        >
          <a
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors duration-200"
          >
            <span className="shrink-0">{e.mark}</span>
            <span className="font-mono text-[13px] font-medium whitespace-nowrap">
              {e.name}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Launches() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 gap-6 ">
      {MENTIONS.map((mention) => (
        <li
          key={mention.url}
          className="grayscale opacity-60 hover:grayscale-0 hover:opacity-90 transition-all duration-300 [&>a]:h-10 [&>a]:flex [&>a]:items-center [&_img]:h-10 [&_img]:w-auto [&_img]:object-contain [&_svg]:h-10 [&_svg]:w-auto"
        >
          <a
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105"
          >
            <img src={mention.src} alt={mention.alt} width={mention.width} />
          </a>
        </li>
      ))}
      <TinyStartupsBadge />
    </ul>
  );
}

export default function Mentions() {
  return (
    <section className="w-full py-8">
      <p className="text-center text-[11px] font-mono tracking-widest uppercase text-neutral-400 dark:text-neutral-600 mb-6 select-none">
        Endorsements, Mentions &amp; Launches
      </p>
      <div className="space-y-6">
        <Endorsements />
        <Launches />
      </div>
    </section>
  );
}
