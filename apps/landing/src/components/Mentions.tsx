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
  {
    name: " Solana Builders Club ",
    url: "https://solanabuilders.club/",
    mark: (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 709 709"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        xmlSpace="preserve"
        style={{
          fillRule: "evenodd",
          clipRule: "evenodd",
          strokeMiterlimit: 10,
        }}
      >
        <g id="BACKGROUND"></g>
        <g
          id="Artboard1"
          transform="matrix(0.972985,0,0,0.982432,-333.733974,-553.109108)"
        >
          <rect
            x={343}
            y={563}
            width={728}
            height={721}
            style={{ fill: "none" }}
          />
          <g
            id="OBJECTS"
            transform="matrix(4.282353,0,0,4.241176,-9.523294,-10.067765)"
          >
            <g transform="matrix(1,0,0,1,117.16035,269.212917)">
              <path
                d="M0,-98.2C-7.9,-88.7 -2.9,-73.8 -4.4,-63.5C-6,-53.2 -12.2,-49.1 -12.2,-49.1C-12.2,-49.1 -6,-45 -4.4,-34.7C-2.9,-24.4 -7.9,-9.5 0,-0C2.6,3.1 5.7,4.6 8.6,5.4C11.3,6 13.1,8.4 13.1,11.2C13.1,14.7 10.1,17.6 6.5,17.2C-13.5,14.9 -19.5,1.4 -18.5,-15.7C-17.6,-29.9 -19.9,-37.3 -23.9,-40.2C-26.6,-42.1 -28.5,-45 -28.5,-48.3L-28.5,-49.9C-28.5,-53.2 -26.6,-56.1 -23.9,-58C-19.9,-60.8 -17.6,-68.2 -18.5,-82.5C-19.5,-99.6 -13.5,-113.1 6.5,-115.4C10.1,-115.8 13.1,-112.9 13.1,-109.4C13.1,-106.6 11.3,-104.2 8.6,-103.5C5.7,-102.8 2.6,-101.3 0,-98.2"
                style={{ fill: "rgb(45,44,44)", fillRule: "nonzero" }}
              />
            </g>
            <g transform="matrix(1,0,0,1,217.48065,269.212917)">
              <path
                d="M0,-98.2C7.9,-88.7 2.9,-73.8 4.4,-63.5C6,-53.2 12.2,-49.1 12.2,-49.1C12.2,-49.1 6,-45 4.4,-34.7C2.9,-24.4 7.9,-9.5 0,-0C-2.6,3.1 -5.7,4.6 -8.6,5.4C-11.3,6 -13.1,8.4 -13.1,11.2C-13.1,14.7 -10.1,17.6 -6.5,17.2C13.5,14.9 19.5,1.4 18.5,-15.7C17.6,-29.9 19.9,-37.3 23.9,-40.2C26.6,-42.1 28.5,-45 28.5,-48.3L28.5,-49.9C28.5,-53.2 26.6,-56.1 23.9,-58C19.9,-60.8 17.6,-68.2 18.5,-82.5C19.5,-99.6 13.5,-113.1 -6.5,-115.4C-10.1,-115.8 -13.1,-112.9 -13.1,-109.4C-13.1,-106.6 -11.3,-104.2 -8.6,-103.5C-5.7,-102.8 -2.6,-101.3 0,-98.2"
                style={{ fill: "rgb(45,44,44)", fillRule: "nonzero" }}
              />
            </g>
            <g transform="matrix(0,-1,-1,0,139.93255,186.759117)">
              <path
                d="M-16.6,-16.6C-25.8,-16.6 -33.2,-9.2 -33.2,0C-33.2,9.2 -25.8,16.6 -16.6,16.6C-7.4,16.6 0,9.2 0,0C0,-9.2 -7.4,-16.6 -16.6,-16.6"
                style={{ fill: "rgb(45,44,44)", fillRule: "nonzero" }}
              />
            </g>
            <g transform="matrix(0,-1,-1,0,194.70755,186.759117)">
              <path
                d="M-16.6,-16.6C-25.8,-16.6 -33.2,-9.2 -33.2,0C-33.2,9.2 -25.8,16.6 -16.6,16.6C-7.4,16.6 0,9.2 0,0C0,-9.2 -7.4,-16.6 -16.6,-16.6"
                style={{ fill: "rgb(45,44,44)", fillRule: "nonzero" }}
              />
            </g>
            <g transform="matrix(1,0,0,1,152.24285,192.832517)">
              <path
                d="M0,12C0,12 2.8,0 15.1,0C27.4,0 30.2,12 30.2,12"
                style={{
                  fill: "none",
                  fillRule: "nonzero",
                  stroke: "rgb(45,44,44)",
                  strokeWidth: "3px",
                }}
              />
            </g>
            <g transform="matrix(1,0,0,1,181.27315,253.467717)">
              <path
                d="M0,-9.1C0,-9.1 -2.6,0 -14,0C-25.3,0 -27.9,-9.1 -27.9,-9.1"
                style={{
                  fill: "none",
                  fillRule: "nonzero",
                  stroke: "rgb(45,44,44)",
                  strokeWidth: "4px",
                  strokeLinecap: "round",
                }}
              />
            </g>
          </g>
        </g>
      </svg>
    ),
  },
  {
    name: "Zerion",
    url: "https://x.com/gyan_w3b/status/2060406565627453930",
    mark: (
      <svg
        width="400"
        height="400"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clip-path="url(#clip0_2462_1024)">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M228.778 194.668C189.562 173.476 141.846 145.995 105.934 123.596C95.3385 115.962 100.716 99.7607 113.522 99.7607H291.214C301.126 99.7607 307.757 110.812 302.79 119.175C290.85 139.797 273.418 165.979 258.857 186.738C251.041 197.881 238.303 199.795 228.778 194.668ZM171.584 201.55C209.501 221.762 262.64 252.501 300.398 275.744C312.088 282.944 307.416 300.217 293.79 300.217C271.492 300.217 235.258 300.223 199.213 300.228C163.54 300.234 128.051 300.24 106.436 300.24C95.5444 300.24 89.9616 288.937 94.5874 281.053C110.219 254.415 127.788 227.527 142.394 207.452C148.888 198.496 162.105 196.491 171.584 201.55Z"
            fill="black"
          />
        </g>
        <defs>
          <clipPath id="clip0_2462_1024">
            <rect width="400" height="400" fill="black" />
          </clipPath>
        </defs>
      </svg>
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
            <span className="font-mono text-[13px] font-medium whitespace-nowrap text-neutral-800 hover:text-black">
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
