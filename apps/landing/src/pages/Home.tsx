import { motion } from "framer-motion";
import {
  RefreshCw,
  Target,
  TrendingUp,
  ChevronDown,
  Zap,
  Lightbulb,
  Palette,
  ShoppingCart,
  ArrowRight,
  Terminal,
  Check,
  HelpCircle,
  Lock,
  Shield,
  CreditCard,
  Code2,
  Rocket,
  Cpu,
} from "lucide-react";
import GetStartedSection from "../components/GetStartedSection";
import ProductScreenshotSection from "../components/ProductScreenshotSection";
import PartnerBanner from "../components/PartnerBanner";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden py-20 md:py-32 px-4 text-center dot-pattern">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl gradient-orb"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl gradient-orb-2"
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-5xl mx-auto"
        >
          <motion.h1
            className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Automated Recurring Payments for{" "}
            <span className="gradient-text font-bold">Solana</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Web2's payment simplicity, Web3's security. Three payment models—
            Subscriptions, Milestones, Pay-as-you-go—powered by token
            delegation.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.a
              href="https://docs.tributary.so/how"
              className="btn-primary text-lg flex items-center gap-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Building <ArrowRight className="w-4 h-4" />
            </motion.a>
            <motion.a
              href="https://docs.tributary.so"
              className="btn-secondary text-lg"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              View Docs
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

      <PartnerBanner />

      <section className="py-12 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">400ms</h3>
              <p className="text-muted-foreground text-sm">
                Transaction Finality
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-4">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Non-Custodial</h3>
              <p className="text-muted-foreground text-sm">
                Funds Stay in Your Wallet
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-6"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">3 Weeks</h3>
              <p className="text-muted-foreground text-sm">
                From Concept to Production
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <GetStartedSection />

      <ProductScreenshotSection />

      <motion.section
        className="bg-muted/50 rounded-2xl p-8 text-center mx-4 max-w-6xl lg:mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl font-bold mb-4">
          Ready to explore the dashboard?
        </h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Visit the live Tributary app to see how recurring payments work on
          Solana, or dive into the documentation to start building your own
          integration.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.a
            href="https://app.tributary.so"
            className="btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Open Live Dashboard
          </motion.a>
          <motion.a
            href="https://docs.tributary.so"
            className="btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Read Documentation
          </motion.a>
        </div>
      </motion.section>

      <section id="payment-solutions" className="py-24 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              Three Payment Models, One Protocol
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Tributary supports flexible payment types to fit any business
              model—from predictable SaaS subscriptions to usage-based AI APIs.
            </p>
          </motion.div>

          <div className="bento-grid">
            <motion.div
              className="card bento-span-2 md:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
                  <RefreshCw className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Subscriptions</h3>
                  <p className="text-primary font-medium">
                    Predictable recurring payments
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Set it and forget it. Fixed payments charge automatically at
                regular intervals—daily, weekly, monthly, or custom schedules.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wide mb-3">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Automated recurring charges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Flexible intervals (daily to yearly)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Optional renewal limits</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                  SaaS
                </span>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                  Content
                </span>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                  Memberships
                </span>
              </div>
            </motion.div>

            <motion.div
              className="card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-accent to-accent/80 rounded-xl">
                  <Target className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Milestones</h3>
                  <p className="text-accent font-medium">
                    Pay as work completes
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Up to 4 milestones with custom amounts and release conditions.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wide mb-3">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Variable amounts per phase</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Escrow security</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium">
                  Freelance
                </span>
                <span className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium">
                  Consulting
                </span>
              </div>
            </motion.div>

            <motion.div
              className="card bento-span-2 md:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Pay-as-you-go</h3>
                  <p className="text-blue-500 font-medium">
                    Only pay for what you use
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Usage-based billing with smart limits. Providers claim funds as
                services are consumed, within your predefined budget.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wide mb-3">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Usage-based charges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Budget protection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Automatic period resets</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full font-medium">
                  AI/LLM
                </span>
                <span className="text-xs bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full font-medium">
                  API
                </span>
                <span className="text-xs bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full font-medium">
                  Cloud
                </span>
              </div>
            </motion.div>

            <motion.div
              className="card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">UpTo</h3>
                  <p className="text-orange-500 font-medium">
                    One-time claim, expiring policy
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Pre-approve token budget. Provider claims once before policy
                expires. x402 compliant for HTTP 402 micropayments.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wide mb-3">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Single claim window</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>x402 HTTP 402 compliant</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full font-medium">
                  API
                </span>
                <span className="text-xs bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full font-medium">
                  x402
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              How Tributary Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Leveraging Solana's native token delegation for seamless, secure
              payments
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-8">
                <motion.div
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex-shrink-0 shadow-lg shadow-primary/20">
                    <Lock className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      User Approves Subscription
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Single transaction grants delegate permissions. Funds stay
                      in wallet.
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex-shrink-0 shadow-lg shadow-primary/20">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Tributary Executes Payment
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Permissionless contract processes payments automatically
                      when due.
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <div className="p-3 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex-shrink-0 shadow-lg shadow-accent/20">
                    <Shield className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Funds Flow to Recipient
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Direct transfer, no escrow, full transparency.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-10 text-center border border-primary/10"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Terminal className="w-12 h-12 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">Simple Integration</h3>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-6">
                Drop pre-built components into your app. Accept subscription
                payments immediately.
              </p>
              <motion.a
                href="#get-started"
                className="inline-block btn-primary"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                See Code Examples <ArrowRight className="w-4 h-4 inline" />
              </motion.a>
            </motion.div>
          </div>

          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-10 gradient-text">
              Perfect for any recurring revenue model
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                whileHover={{ y: -3 }}
              >
                <Lightbulb className="w-10 h-10 text-primary mx-auto mb-4" />
                <h4 className="font-bold mb-3 text-lg">SaaS Platforms</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Monthly/annual software subscriptions
                </p>
              </motion.div>
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                whileHover={{ y: -3 }}
              >
                <Palette className="w-10 h-10 text-accent mx-auto mb-4" />
                <h4 className="font-bold mb-3 text-lg">Content Creators</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Fan subscriptions, premium content
                </p>
              </motion.div>
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                whileHover={{ y: -3 }}
              >
                <TrendingUp className="w-10 h-10 text-blue-500 mx-auto mb-4" />
                <h4 className="font-bold mb-3 text-lg">AI & APIs</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Token usage, compute billing
                </p>
              </motion.div>
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                whileHover={{ y: -3 }}
              >
                <ShoppingCart className="w-10 h-10 text-orange-500 mx-auto mb-4" />
                <h4 className="font-bold mb-3 text-lg">E-commerce</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Product subscriptions, memberships
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="testimonials" className="py-24 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-6 gradient-text"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Loved by developers worldwide
          </motion.h2>
          <motion.p
            className="text-lg text-muted-foreground max-w-3xl mx-auto mb-16 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Hear what our community and partners are saying about Tributary.
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              className="card text-left"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.svg
                    key={star}
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-yellow-400"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.21 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </motion.svg>
                ))}
                <span className="ml-3 text-muted-foreground text-sm font-medium">
                  5/5
                </span>
              </div>
              <p className="text-muted-foreground italic mb-6 text-base leading-relaxed">
                "Tributary has revolutionized how we handle subscriptions. The
                non-custodial approach is a game-changer."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/contributeso.png"
                  alt="Fabian Schuh"
                  className="w-12 h-12 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-sm">Dr.-Ing. Fabian Schuh</p>
                  <p className="text-xs text-muted-foreground">
                    CTO, Contribute.so
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="card text-left"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.svg
                    key={star}
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-yellow-400"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.21 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </motion.svg>
                ))}
                <span className="ml-3 text-muted-foreground text-sm font-medium">
                  5/5
                </span>
              </div>
              <p className="text-muted-foreground italic mb-6 text-base leading-relaxed">
                "A robust solution for recurring payments on Solana that doesn't
                compromise on security or user experience."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/2.png"
                  alt="Corinna Abdel-Ibra"
                  className="w-12 h-12 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-sm">Corinna Abdel-Ibra</p>
                  <p className="text-xs text-muted-foreground">
                    Founder, Allowly
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="card text-left"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.svg
                    key={star}
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-yellow-400"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.21 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </motion.svg>
                ))}
                <span className="ml-3 text-muted-foreground text-sm font-medium">
                  5/5
                </span>
              </div>
              <p className="text-muted-foreground italic mb-6 text-base leading-relaxed">
                "Engineers integrated Tributary SDK in days. Cash loans tracked
                on-chain with automatic repayments."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/yumi-finance.png"
                  alt="Vladislav Lenskii"
                  className="w-12 h-12 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-sm">Vladislav Lenskii</p>
                  <p className="text-xs text-muted-foreground">
                    Founder, Yumi Finance
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-16"
          >
            <div className="max-w-7xl mx-auto text-center">
              <motion.p
                className="text-muted-foreground text-lg mb-10"
                initial={{ y: 15, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                Trusted by innovative projects on Solana
              </motion.p>
              <motion.div
                className="flex flex-wrap justify-center items-center gap-12"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <motion.span
                  className="text-primary font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  Solana
                </motion.span>
                <motion.span
                  className="text-primary font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  DeFi Protocols
                </motion.span>
                <motion.span
                  className="text-primary font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  SaaS Platforms
                </motion.span>
                <motion.span
                  className="text-primary font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  Content Creators
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="faq" className="py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Find answers to common questions about Tributary.
            </p>
          </motion.div>

          <div className="space-y-4">
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>What is Tributary?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed">
                Tributary is a Solana-native protocol enabling automated,
                non-custodial recurring payments through token delegation. It
                supports three payment models: Subscriptions, Milestones, and
                Pay-as-you-go.
              </p>
            </motion.details>

            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>How does token delegation work?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed">
                Users sign a single transaction to delegate tokens to
                Tributary's smart contract. The protocol executes payments
                automatically without locking funds in escrow. Users retain full
                custody and can revoke delegation anytime.
              </p>
            </motion.details>

            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Is Tributary secure?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed">
                Yes. Funds remain in your wallet. Tributary only has delegated
                authority for specific amounts. Open-source, audited, revocable
                anytime. Full CI/CD pipeline with comprehensive testing.
              </p>
            </motion.details>

            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Can users cancel subscriptions?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed">
                Absolutely. Users have full control and can pause, resume, or
                cancel anytime through wallet or dApp.
              </p>
            </motion.details>

            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <Code2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>What payment types are supported?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed">
                Tributary supports three payment models: Subscriptions for fixed
                recurring payments, Milestones for project-based phased
                payments, and Pay-as-you-go for usage-based billing with budget
                controls.
              </p>
            </motion.details>

            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>What is x402 integration?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-muted-foreground text-base leading-relaxed">
                Tributary powers x402 (HTTP 402 Payment Required) implementation
                for web micropayments. This enables seamless payment flows over
                HTTP without breaking the request-response cycle, ideal for API
                monetization and micropayments.
              </p>
            </motion.details>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              Ready to Build?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Start accepting recurring payments on Solana in minutes. Complete
              SDK, React components, and comprehensive documentation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="https://docs.tributary.so"
                className="btn-primary text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.a>
              <motion.a
                href="https://app.tributary.so"
                className="btn-secondary text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Demo
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
