import { motion } from "framer-motion";

interface Partner {
  name: string;
  logo: string;
  link: string;
}

const PARTNERS: Partner[] = [
  {
    name: "Contribute.so",
    logo: "/testimony/contributeso.svg",
    link: "https://contribute.so",
  },
  { name: "Allowly", logo: "🔐", link: "https://allowly.io" },
  {
    name: "Yumi Finance",
    logo: "/testimony/yumi-finance.png",
    link: "https://yumifinance.io",
  },
  {
    name: "Superteam Germany",
    logo: "/superteamde.png",
    link: "https://superteam.fun",
  },
  {
    name: "Solana Foundation",
    logo: "/solanaLogoMark.svg",
    link: "https://solana.com",
  },
];

const SinglePartner = ({ partner }: { partner: Partner }) => (
  <motion.a
    key={partner.name}
    href={partner.link}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 flex flex-col items-center gap-3 px-6 py-4 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <div className="w-16 h-16 md:w-20 md:h-20 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 flex items-center justify-center mb-2">
      {partner.logo.startsWith("data:") ||
      partner.logo.startsWith("/") ||
      partner.logo.startsWith("http") ? (
        <img
          src={partner.logo}
          alt={partner.name}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className="text-5xl md:text-6xl">{partner.logo}</span>
      )}
    </div>
    <span className="text-md md:text-xl font-medium text-neutral-700 hover:text-primary transition-colors duration-300">
      {partner.name}
    </span>
  </motion.a>
);

export default function PartnerBanner() {
  return (
    <section className="py-12 px-4 bg-gradient-to-r from-neutral-100 to-neutral-50 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center mb-8">
        <motion.h3
          className="text-2xl md:text-3xl font-bold gradient-text"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Trusted by leading Web3 projects
        </motion.h3>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative"
      >
        <div className="group relative overflow-hidden whitespace-nowrap py-4 [mask-image:_linear-gradient(to_right,_transparent_0,_white_128px,white_calc(100%-128px),_transparent_100%)]">
          <div className="animate-slide-left group-hover:animation-pause inline-flex w-max gap-12">
            {PARTNERS.map((partner) => (
              <SinglePartner key={partner.name} partner={partner} />
            ))}
          </div>
          <div className="animate-slide-left group-hover:animation-pause inline-flex w-max gap-12">
            {PARTNERS.map((partner) => (
              <SinglePartner key={`${partner.name}-2`} partner={partner} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
