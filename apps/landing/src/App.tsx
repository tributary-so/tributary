import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Target,
  TrendingUp,
  ChevronDown,
  Moon,
  Sun,
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
  Menu,
  X as XIcon,
} from "lucide-react";
import logo from "./assets/logo.png";
import GetStartedSection from "./components/GetStartedSection";
import ProductScreenshotSection from "./components/ProductScreenshotSection";
import PartnerBanner from "./components/PartnerBanner";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* Navigation Bar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 glass py-4 px-4"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 text-2xl font-bold"
            whileHover={{ scale: 1.05 }}
          >
            <img src={logo} alt="Tributary Logo" className="h-10 w-10" />
            <span className="gradient-text font-bold text-2xl">Tributary</span>
          </motion.div>

          <nav className="hidden md:flex space-x-8 items-center">
            <motion.a
              href="#how-it-works"
              className="text-neutral-700 dark:text-neutral-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
            >
              How It Works
            </motion.a>
            <motion.a
              href="#testimonials"
              className="text-neutral-700 dark:text-neutral-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
            >
              Testimonials
            </motion.a>
            <motion.a
              href="#faq"
              className="text-neutral-700 dark:text-neutral-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
            >
              FAQ
            </motion.a>

            <motion.button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-purple-500" />
              )}
            </motion.button>

            <motion.a
              href="https://app.tributary.so"
              className="btn-primary text-sm md:text-base"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Open App
            </motion.a>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XIcon className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 space-y-4"
          >
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-neutral-700 dark:text-neutral-300"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-neutral-700 dark:text-neutral-300"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-neutral-700 dark:text-neutral-300"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-neutral-700 dark:text-neutral-300"
            >
              FAQ
            </a>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              Toggle Theme
            </button>
          </motion.div>
        )}
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 px-4 text-center dot-pattern">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl gradient-orb"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl gradient-orb-2"
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
            className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Web2's payment simplicity, Web3's security. Users approve once, then
            subscriptions flow automatically from their wallet.
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

      {/* Partner Banner */}
      <PartnerBanner />

      {/* Get Started Section */}
      <GetStartedSection />

      {/* Product Screenshot Section */}
      <ProductScreenshotSection />

      <motion.section
        className="bg-neutral-50 rounded-2xl p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <h3 className="text-2xl font-bold mb-4">
          Ready to explore the dashboard?
        </h3>
        <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
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

      {/* Payment Solutions Section - Bento Grid */}
      <section
        id="payment-solutions"
        className="py-24 px-4 bg-white dark:bg-neutral-900"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              Four Payment Models, One Protocol
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed">
              Tributary supports flexible payment types to fit any business
              model
            </p>
          </motion.div>

          <div className="bento-grid">
            {/* Subscriptions - Full width on mobile, 2 columns on larger screens */}
            <motion.div
              className="card bento-span-2 md:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Subscriptions
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">
                    Predictable recurring payments
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                Set it and forget it. Fixed payments charge automatically at
                regular intervals—daily, weekly, monthly, or custom schedules.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-3 text-sm uppercase tracking-wide">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Automated recurring charges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Flexible intervals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Optional renewal limits</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full font-medium">
                  SaaS
                </span>
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full font-medium">
                  Content
                </span>
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full font-medium">
                  Memberships
                </span>
              </div>
            </motion.div>

            {/* Milestone Payments */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Milestones
                  </h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Pay as work completes
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                Up to 4 milestones with custom amounts and release conditions.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-3 text-sm uppercase tracking-wide">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Variable amounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Escrow security</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full font-medium">
                  Freelance
                </span>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full font-medium">
                  Consulting
                </span>
              </div>
            </motion.div>

            {/* Pay-as-you-go - Full width */}
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
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Pay-as-you-go
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    Only pay for what you use
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                Usage-based billing with smart limits. Providers claim funds as
                services are consumed, within your predefined budget.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-3 text-sm uppercase tracking-wide">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Usage-based charges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Budget protection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Automatic resets</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full font-medium">
                  AI/LLM
                </span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full font-medium">
                  API
                </span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full font-medium">
                  Cloud
                </span>
              </div>
            </motion.div>

            {/* UpTo - Single claim, expiring policy */}
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
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    UpTo
                  </h3>
                  <p className="text-orange-600 dark:text-orange-400 font-medium">
                    One-time claim, expiring policy
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                Pre-approve token budget. Provider claims once before policy
                expires. Coinbases/x402 compliant for maximum interoperability.
              </p>

              <div className="mb-6">
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-3 text-sm uppercase tracking-wide">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Single claim window</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Policy expiration control</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Coinbases/x402 compliant</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Pre-approved budget</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full font-medium">
                  API
                </span>
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full font-medium">
                  x402
                </span>
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full font-medium">
                  One-time access
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-24 px-4 bg-neutral-50 dark:bg-neutral-950"
      >
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
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed">
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
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex-shrink-0 shadow-lg shadow-purple-500/20">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                      User Approves Subscription
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex-shrink-0 shadow-lg shadow-purple-500/20">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                      Tributary Executes Payment
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex-shrink-0 shadow-lg shadow-emerald-500/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                      Funds Flow to Recipient
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Direct transfer, no escrow, full transparency.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              className="bg-gradient-to-br from-purple-500/5 to-emerald-500/5 dark:from-purple-500/10 dark:to-emerald-500/10 rounded-3xl p-10 text-center border border-purple-500/10 dark:border-purple-500/20"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Terminal className="w-12 h-12 text-purple-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
                Simple Integration
              </h3>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl mx-auto mb-6">
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

          {/* Use Cases */}
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
                <Lightbulb className="w-10 h-10 text-purple-500 mx-auto mb-4" />
                <h4 className="font-bold mb-3 text-neutral-900 dark:text-neutral-100 text-lg">
                  SaaS Platforms
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm">
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
                <Palette className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                <h4 className="font-bold mb-3 text-neutral-900 dark:text-neutral-100 text-lg">
                  Content Creators
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm">
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
                <h4 className="font-bold mb-3 text-neutral-900 dark:text-neutral-100 text-lg">
                  DeFi Protocols
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm">
                  Strategy fees, premium features
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
                <h4 className="font-bold mb-3 text-neutral-900 dark:text-neutral-100 text-lg">
                  E-commerce
                </h4>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm">
                  Product subscriptions, DAO memberships
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-24 px-4 bg-neutral-50 dark:bg-neutral-950"
      >
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
            className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-16 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Hear what our community and partners are saying about Tributary.
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
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
                <span className="ml-3 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                  5/5
                </span>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 italic mb-6 text-base leading-relaxed">
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
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                    Dr.-Ing. Fabian Schuh
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    CTO, Contribute.so
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
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
                <span className="ml-3 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                  5/5
                </span>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 italic mb-6 text-base leading-relaxed">
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
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                    Corinna Abdel-Ibra
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Founder, Allowly
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
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
                <span className="ml-3 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                  5/5
                </span>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 italic mb-6 text-base leading-relaxed">
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
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                    Vladislav Lenskii
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
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
                className="text-neutral-600 dark:text-neutral-400 text-lg mb-10"
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
                  className="text-purple-600 dark:text-purple-400 font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  Solana
                </motion.span>
                <motion.span
                  className="text-purple-600 dark:text-purple-400 font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  DeFi Protocols
                </motion.span>
                <motion.span
                  className="text-purple-600 dark:text-purple-400 font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  SaaS Platforms
                </motion.span>
                <motion.span
                  className="text-purple-600 dark:text-purple-400 font-bold text-xl"
                  whileHover={{ scale: 1.05 }}
                >
                  Content Creators
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 bg-white dark:bg-neutral-900">
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
            <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Find answers to common questions about Tributary.
            </p>
          </motion.div>

          <div className="space-y-4">
            {/* FAQ Item 1 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span>What is Tributary?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-neutral-600 dark:text-neutral-400 text-base leading-relaxed">
                Tributary is a Solana-native protocol enabling automated,
                non-custodial recurring payments through token delegation.
              </p>
            </motion.details>

            {/* FAQ Item 2 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span>How does token delegation work?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-neutral-600 dark:text-neutral-400 text-base leading-relaxed">
                Users sign a single transaction to delegate tokens to
                Tributary's smart contract. The protocol executes payments
                automatically without locking funds in escrow.
              </p>
            </motion.details>

            {/* FAQ Item 3 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span>Is Tributary secure?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-neutral-600 dark:text-neutral-400 text-base leading-relaxed">
                Yes. Funds remain in your wallet. Tributary only has delegated
                authority for specific amounts. Open-source, audited, revocable
                anytime.
              </p>
            </motion.details>

            {/* FAQ Item 4 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span>Can users cancel subscriptions?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-neutral-600 dark:text-neutral-400 text-base leading-relaxed">
                Absolutely. Users have full control and can pause, resume, or
                cancel anytime through wallet or dApp.
              </p>
            </motion.details>

            {/* FAQ Item 5 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <summary className="flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span>How does it compare to other protocols?</span>
                </div>
                <ChevronDown className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <p className="mt-6 text-neutral-600 text-lg leading-relaxed">
                Tributary is a Solana-native protocol enabling automated,
                non-custodial recurring payments through token delegation. It
                provides the foundational infrastructure for Web3 subscription
                services.
              </p>
            </motion.details>

            {/* FAQ Item 2 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <summary className="flex justify-between items-center font-bold text-xl text-neutral-900 hover:text-primary transition-colors">
                How does token delegation work?
                <span className="group-open:rotate-180 transition-transform duration-300">
                  <svg
                    className="w-6 h-6 text-neutral-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-6 text-neutral-600 text-lg leading-relaxed">
                Users sign a single transaction to delegate a specific amount of
                tokens for a defined period to Tributary's smart contract. This
                allows the protocol to execute payments automatically without
                locking up funds in an escrow.
              </p>
            </motion.details>

            {/* FAQ Item 3 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <summary className="flex justify-between items-center font-bold text-xl text-neutral-900 hover:text-primary transition-colors">
                Is Tributary secure?
                <span className="group-open:rotate-180 transition-transform duration-300">
                  <svg
                    className="w-6 h-6 text-neutral-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-6 text-neutral-600 text-lg leading-relaxed">
                Yes, Tributary is designed to be non-custodial and secure. Funds
                remain in your wallet, and the protocol only has delegated
                authority to transfer specific amounts for defined subscription
                periods. It's open-source, will undergo professional security
                audits, and allows you to revoke delegation anytime.
              </p>
            </motion.details>

            {/* FAQ Item 4 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <summary className="flex justify-between items-center font-bold text-xl text-neutral-900 hover:text-primary transition-colors">
                Can users cancel or modify subscriptions?
                <span className="group-open:rotate-180 transition-transform duration-300">
                  <svg
                    className="w-6 h-6 text-neutral-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-6 text-neutral-600 text-lg leading-relaxed">
                Absolutely. Users have full control over their subscriptions and
                can pause, resume, or cancel them at any time through their
                wallet interface or a dApp built on Tributary.
              </p>
            </motion.details>

            {/* FAQ Item 5 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <summary className="flex justify-between items-center font-bold text-xl text-neutral-900 hover:text-primary transition-colors">
                How does Tributary's security compare to other protocols?
                <span className="group-open:rotate-180 transition-transform duration-300">
                  <svg
                    className="w-6 h-6 text-neutral-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-6 text-neutral-600 text-lg leading-relaxed">
                Unlike protocols like x402 where private keys must be accessible
                to AI agents or bots—granting access to your entire wallet and
                all assets—Tributary limits delegation to a specific token
                (e.g., USDC) and a predefined amount. This minimizes the impact
                radius of any potential compromise, allowing private keys to
                remain cold and secure.
              </p>
            </motion.details>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-4 bg-gradient-to-r from-primary via-secondary to-electric text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <motion.div
          className="relative z-10 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            Ready to revolutionize your recurring payments?
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90 leading-relaxed">
            Join the future of Web3 subscriptions. Give your users the seamless
            payment experience they expect, with the transparency and control
            they deserve.
          </p>
          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.a
              href="https://docs.tributary.so/how"
              className="bg-white text-primary font-bold py-4 px-12 rounded-full hover:bg-neutral-100 transition-all text-lg shadow-2xl"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started Now
            </motion.a>
            <motion.a
              href="https://docs.tributary.so"
              className="border-2 border-white text-white font-bold py-4 px-12 rounded-full hover:bg-white hover:text-primary transition-all text-lg shadow-2xl"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Read Documentation
            </motion.a>
          </motion.div>
          <motion.p
            className="text-lg opacity-80 font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Free to use • Open source • Built on Solana
          </motion.p>
        </motion.div>
        <motion.div
          className="absolute top-10 left-10 w-32 h-32 bg-accent rounded-full opacity-10 animate-float"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        ></motion.div>
        <motion.div
          className="absolute bottom-10 right-10 w-24 h-24 bg-electric rounded-full opacity-15 animate-float"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
        ></motion.div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-neutral-900 text-neutral-300 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-3xl font-bold gradient-text mb-6">
                Tributary
              </div>
              <p className="text-base leading-relaxed text-neutral-400">
                Bringing Web2's subscription simplicity to Web3 with truly
                automated recurring payments on Solana.
              </p>
            </motion.div>
            <div></div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h4 className="font-bold text-white mb-6 text-lg">Product</h4>
              <ul className="space-y-3 text-base">
                <li>
                  <a
                    href="#features"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">✨</span> Features
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.tributary.so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">📚</span>{" "}
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/tributary-so/tributary/tree/main/sdk"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">🛠️</span> SDK
                  </a>
                </li>
                <li>
                  <a
                    href="https://sdk.tributary.so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">📚 </span> SDK
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://app.tributary.so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">📊</span> Dashboard
                  </a>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h4 className="font-bold text-white mb-6 text-lg">Resources</h4>
              <ul className="space-y-3 text-base">
                <li>
                  <a
                    href="https://tributary.so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">🏠</span> Website
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.tributary.so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">📚</span>{" "}
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/tributary-so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">💻</span> GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/tributaryso"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">💬</span> Telegram
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/tributaryso"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">🐦</span> X (Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@tributary.so"
                    className="hover:text-electric transition-colors flex items-center gap-2"
                  >
                    <span className="grayscale opacity-60">📧</span> Contact
                  </a>
                </li>
              </ul>
            </motion.div>
          </div>
          <motion.div
            className="border-t border-neutral-800 mt-16 pt-8 text-center text-base text-neutral-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            © 2024 Tributary. All rights reserved.
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

export default App;
