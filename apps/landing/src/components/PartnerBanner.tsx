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
  {
    name: "Allowly",
    logo: "🔐",
    link: "https://allowly.io",
  },
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
    className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3 rounded-lg hover:bg-white dark:hover:bg-neutral-800 hover:shadow-md transition-all duration-300 border border-transparent hover:border-purple-500/20 dark:hover:border-purple-500/30"
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
  >
    <div className="w-12 h-12 md:w-16 md:h-16 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 flex items-center justify-center">
      {partner.logo.startsWith("data:") ||
      partner.logo.startsWith("/") ||
      partner.logo.startsWith("http") ? (
        <img
          src={partner.logo}
          alt={partner.name}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className="text-3xl md:text-4xl">{partner.logo}</span>
      )}
    </div>
    <span className="text-sm md:text-base font-medium text-neutral-600 dark:text-neutral-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors duration-300">
      {partner.name}
    </span>
  </motion.a>
);

export default function PartnerBanner() {
  return (
    <section className="py-16 px-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto text-center mb-8">
        <motion.h3
          className="text-2xl md:text-3xl font-bold gradient-text"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Trusted by leading Web3 projects
        </motion.h3>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="group relative overflow-hidden whitespace-nowrap py-4 [mask-image:linear-gradient(to_right,transparent_0,white_96px,white_calc(100%-96px),transparent_100%)] dark:[mask-image:linear-gradient(to_right,transparent_0,#0a0a0a_96px,#0a0a0a_calc(100%-96px),transparent_100%)]">
          <div className="animate-slide-left group-hover:animation-pause inline-flex w-max gap-10">
            {PARTNERS.map((partner) => (
              <SinglePartner key={partner.name} partner={partner} />
            ))}
          </div>
          <div className="animate-slide-left group-hover:animation-pause inline-flex w-max gap-10">
            {PARTNERS.map((partner) => (
              <SinglePartner key={`${partner.name}-2`} partner={partner} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
