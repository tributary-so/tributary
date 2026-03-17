import { motion } from "framer-motion";

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: "🚀",
    title: "Launch in Days, Not Months",
    description:
      "Get started with our SDK and integrate subscription payments into your app in hours, not weeks.",
  },
  {
    icon: "💰",
    title: "Keep Revenue Predictable",
    description:
      "Stop chasing payments. Subscription automation ensures steady cash flow for your business.",
  },
  {
    icon: "🔒",
    title: "Security Without Compromise",
    description:
      "Funds stay in user wallets. Only authorized payments execute—no escrow, no risk.",
  },
  {
    icon: "⚙️",
    title: "Complete Customization",
    description:
      "Flexible intervals, custom fees, and multiple payment types fit any business model.",
  },
  {
    icon: "🌐",
    title: "Works With Any Token",
    description:
      "Support for all SPL tokens means you can accept payments in USDC, SOL, or your custom token.",
  },
  {
    icon: "🎯",
    title: "Built for Web3 Scale",
    description:
      "Handle millions of payments without bottlenecks. Solana's speed, Tributary's automation.",
  },
];

const BenefitCard = ({ benefit }: { benefit: Benefit }) => (
  <motion.div
    className="card text-center"
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    whileHover={{ y: -8 }}
  >
    <div className="text-5xl mb-6">{benefit.icon}</div>
    <h3 className="text-xl font-bold mb-4 text-neutral-900">{benefit.title}</h3>
    <p className="text-neutral-600 leading-relaxed">{benefit.description}</p>
  </motion.div>
);

const BenefitsSection = () => {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
            Why Developers Choose Tributary
          </h2>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
            Six reasons why teams trust Tributary for their Web3 subscription
            infrastructure.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BENEFITS.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
