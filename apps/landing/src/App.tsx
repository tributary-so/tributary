import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./assets/logo.png";
import GetStartedSection from "./components/GetStartedSection";
import ProductScreenshotSection from "./components/ProductScreenshotSection";

function App() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // No longer using feather icons or AOS, so these can be removed or replaced with modern alternatives
    // AOS.init();
    // feather.replace();
  }, []);

  /**
   * Scrolls smoothly to a section by ID
   * @param id - The section ID to scroll to (without #)
   */
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
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
            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <motion.button
                className="text-neutral-700 hover:text-primary transition-colors font-medium flex items-center gap-1"
                whileHover={{ scale: 1.1 }}
              >
                Solutions
                <span
                  className={`text-xs transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50"
                  >
                    <button
                      onClick={() => scrollToSection("subscriptions")}
                      className="w-full text-left px-5 py-3 hover:bg-neutral-50 transition-colors text-neutral-700 hover:text-primary font-medium"
                    >
                      <div className="text-base">🔄 Subscriptions</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Recurring payments
                      </div>
                    </button>
                    <button
                      onClick={() => scrollToSection("milestones")}
                      className="w-full text-left px-5 py-3 hover:bg-neutral-50 transition-colors text-neutral-700 hover:text-primary font-medium"
                    >
                      <div className="text-base">🎯 Milestone Payments</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Pay as work completes
                      </div>
                    </button>
                    <button
                      onClick={() => scrollToSection("payasyougo")}
                      className="w-full text-left px-5 py-3 hover:bg-neutral-50 transition-colors text-neutral-700 hover:text-primary font-medium"
                    >
                      <div className="text-base">📈 Pay-as-you-go</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Usage-based billing
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.a
              href="#how-it-works"
              className="text-neutral-700 hover:text-primary transition-colors font-medium"
              whileHover={{ scale: 1.1 }}
            >
              How It Works
            </motion.a>
            <motion.a
              href="#pricing"
              className="text-neutral-700 hover:text-primary transition-colors font-medium"
              whileHover={{ scale: 1.1 }}
            >
              Pricing
            </motion.a>
            <motion.a
              href="#testimonials"
              className="text-neutral-700 hover:text-primary transition-colors font-medium"
              whileHover={{ scale: 1.1 }}
            >
              Testimonials
            </motion.a>
            <motion.a
              href="#faq"
              className="text-neutral-700 hover:text-primary transition-colors font-medium"
              whileHover={{ scale: 1.1 }}
            >
              FAQ
            </motion.a>
          </nav>
          <motion.a
            href="https://app.tributary.so"
            className="btn-primary text-sm md:text-base"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Open App
          </motion.a>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-32 px-4 text-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <motion.h1
            className="text-6xl md:text-8xl font-extrabold mb-8 leading-tight"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            Automated Recurring Payments for the{" "}
            <span className="gradient-text font-bold">Solana</span> Ecosystem
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-neutral-600 mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Tributary brings Web2's payment simplicity to Web3. Users approve
            once, then subscriptions, milestones, and pay-as-you-go flow
            seamlessly and securely directly from their token accounts.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.a
              href="https://docs.tributary.so/how"
              className="btn-primary text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Building
            </motion.a>
            <motion.a
              href="https://docs.tributary.so"
              className="btn-secondary text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Documentation
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

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

      {/* Payment Solutions Section */}
      <section id="payment-solutions" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
              Choose Your Payment Model
            </h2>
            <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
              Tributary supports three flexible payment types to fit any
              business model
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Subscriptions */}
            <motion.div
              id="subscriptions"
              className="card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-6xl mb-6 text-center">🔄</div>
              <h3 className="text-3xl font-bold mb-4 text-neutral-900 text-center">
                Subscriptions
              </h3>
              <p className="text-lg font-semibold text-primary mb-6 text-center">
                Predictable recurring payments on autopilot
              </p>
              <p className="text-neutral-600 mb-8 leading-relaxed">
                Set it and forget it. Fixed payments automatically charge at
                regular intervals—daily, weekly, monthly, or custom schedules.
                Perfect for services with consistent pricing.
              </p>

              <div className="mb-8">
                <h4 className="font-bold text-neutral-900 mb-4 text-lg">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Automated recurring charges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Flexible intervals (daily to yearly)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Optional renewal limits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>One-time setup</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-neutral-200">
                <h4 className="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wide">
                  Use Cases
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    SaaS subscriptions
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Content memberships
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Recurring donations
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Software licenses
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    API Providers
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Milestone Payments */}
            <motion.div
              id="milestones"
              className="card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-6xl mb-6 text-center">🎯</div>
              <h3 className="text-3xl font-bold mb-4 text-neutral-900 text-center">
                Milestone Payments
              </h3>
              <p className="text-lg font-semibold text-primary mb-6 text-center">
                Pay as work gets done, not by the clock
              </p>
              <p className="text-neutral-600 mb-8 leading-relaxed">
                Break projects into up to 4 milestones with custom amounts and
                release conditions. Payments unlock when deliverables are
                complete—time-based, manual approval, or automatic.
              </p>

              <div className="mb-8">
                <h4 className="font-bold text-neutral-900 mb-4 text-lg">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Up to 4 project milestones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Variable amounts per phase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Flexible release conditions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Built-in escrow security</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-neutral-200">
                <h4 className="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wide">
                  Use Cases
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Freelance projects
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Software development
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Consulting engagements
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Content series
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Pay-as-you-go */}
            <motion.div
              id="payasyougo"
              className="card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-6xl mb-6 text-center">📈</div>
              <h3 className="text-3xl font-bold mb-4 text-neutral-900 text-center">
                Pay-as-you-go
              </h3>
              <p className="text-lg font-semibold text-primary mb-6 text-center">
                Only pay for what you actually use
              </p>
              <p className="text-neutral-600 mb-8 leading-relaxed">
                Usage-based billing with smart limits. Providers claim funds as
                services are consumed, within your predefined budget. Periods
                reset automatically—no surprises.
              </p>

              <div className="mb-8">
                <h4 className="font-bold text-neutral-900 mb-4 text-lg">
                  Key Benefits
                </h4>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Usage-based charges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Period and chunk limits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Automatic resets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg flex-shrink-0">✓</span>
                    <span>Budget protection</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-neutral-200">
                <h4 className="font-bold text-neutral-900 mb-3 text-sm uppercase tracking-wide">
                  Use Cases
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    AI/LLM services
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    API consumption
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Cloud resources
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    Variable usage apps
                  </span>
                  <span className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    API Providers
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 bg-neutral-100">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
              How Tributary Works
            </h2>
            <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
              Leveraging Solana's native token delegation for seamless, secure,
              and truly automated recurring payments.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="space-y-10">
                <motion.div
                  className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <motion.div
                    className="bg-electric text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg"
                    whileHover={{ scale: 1.1 }}
                  >
                    1
                  </motion.div>
                  <div className="w-full">
                    <h3 className="text-2xl font-semibold mb-3 text-neutral-900">
                      User Approves Subscription
                    </h3>
                    <p className="text-neutral-600 text-lg leading-relaxed max-w-full break-words">
                      User signs a single transaction granting delegate
                      permissions to Tributary's smart contract for a specific
                      token amount and payment schedule. Funds remain in their
                      wallet.
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <motion.div
                    className="bg-electric text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg"
                    whileHover={{ scale: 1.1 }}
                  >
                    2
                  </motion.div>
                  <div className="w-full">
                    <h3 className="text-2xl font-semibold mb-3 text-neutral-900">
                      Tributary Executes Payment
                    </h3>
                    <p className="text-neutral-600 text-lg leading-relaxed max-w-full break-words">
                      Our permissionless smart contract automatically processes
                      payments according to the agreed schedule (e.g., weekly,
                      monthly, custom intervals) when due.
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <motion.div
                    className="bg-electric text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg"
                    whileHover={{ scale: 1.1 }}
                  >
                    3
                  </motion.div>
                  <div className="w-full">
                    <h3 className="text-2xl font-semibold mb-3 text-neutral-900">
                      Funds Flow to Recipient
                    </h3>
                    <p className="text-neutral-600 text-lg leading-relaxed max-w-full break-words">
                      Funds transfer directly from the user's token account to
                      the recipient's account. No escrow, no risk – just
                      reliable, automated payments with full transparency.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              className="w-full max-w-full overflow-hidden mx-auto md:max-w-none md:mx-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-12 text-center"
              initial={{ opacity: 0, x: 0 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-6xl mb-6">⚡</div>
              <h3 className="text-3xl font-bold mb-6 text-neutral-900">
                Simple Integration
              </h3>
              <p className="text-xl text-neutral-600 leading-relaxed max-w-2xl mx-auto">
                Drop our pre-built components into your app and start accepting
                subscription payments immediately. No complex setup required.
              </p>
              <motion.a
                href="#get-started"
                className="inline-block mt-8 btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                See Code Examples Above
              </motion.a>
            </motion.div>
          </div>

          {/* Use Cases */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-3xl md:text-5xl font-bold mb-12 gradient-text">
              Perfect for any recurring revenue model on Solana
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="text-electric mb-6 text-5xl">💡</div>
                <h4 className="font-bold mb-4 text-neutral-900 text-lg">
                  SaaS Platforms
                </h4>
                <p className="text-neutral-600 leading-relaxed">
                  Monthly/annual software subscriptions, API access fees.
                </p>
              </motion.div>
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="text-accent mb-6 text-5xl">🎨</div>
                <h4 className="font-bold mb-4 text-neutral-900 text-lg">
                  Content Creators
                </h4>
                <p className="text-neutral-600 leading-relaxed">
                  Fan subscriptions, premium content access, recurring
                  donations.
                </p>
              </motion.div>
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ y: -5 }}
              >
                <div className="text-primary mb-6 text-5xl">📈</div>
                <h4 className="font-bold mb-4 text-neutral-900 text-lg">
                  DeFi Protocols
                </h4>
                <p className="text-neutral-600 leading-relaxed">
                  Strategy fees, premium feature access, protocol subscriptions.
                </p>
              </motion.div>
              <motion.div
                className="card text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ y: -5 }}
              >
                <div className="text-electric mb-6 text-5xl">🛒</div>
                <h4 className="font-bold mb-4 text-neutral-900 text-lg">
                  E-commerce & Memberships
                </h4>
                <p className="text-neutral-600 leading-relaxed">
                  Product subscriptions, DAO memberships, exclusive access.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
              Tributary is a fundamental infrastructure protocol, charging a 1%
              protocol fee to operate and improve the ecosystem. Businesses
              built on top of Tributary may charge their own separate fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Starter Plan */}
            <motion.div
              className="card flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -10 }}
            >
              <h3 className="text-3xl font-bold mb-4 text-neutral-900">
                Starter
              </h3>
              <p className="text-neutral-600 mb-8">
                Ideal for individuals and small projects getting started.
              </p>
              <div className="text-6xl font-bold gradient-text mb-8">
                $0<span className="text-2xl text-neutral-500">/month</span>
              </div>
              <ul className="space-y-4 text-neutral-700 mb-10 flex-grow">
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Any number of
                  subscriptions
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> 1% protocol fee
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Basic dashboard
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Any SPL token
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Community
                  support
                </li>
              </ul>
              <motion.a
                href="#"
                className="btn-primary text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started Free
              </motion.a>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              className="card flex flex-col relative border-2 border-electric"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -10 }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-electric text-white text-sm font-bold px-4 py-2 rounded-full uppercase shadow-lg">
                Reference Implementation
              </div>
              <h3 className="text-3xl font-bold mb-4 text-neutral-900 mt-4">
                Contribute.so
              </h3>
              <p className="text-neutral-600 mb-8">
                A ready-to-use platform built on Tributary for{" "}
                <span className="font-semibold text-primary">
                  creators and communities
                </span>
                .
              </p>
              <div className="text-6xl font-bold gradient-text mb-8">
                2.5%
                <span className="text-2xl text-neutral-500">
                  {" "}
                  (business fee)
                </span>
              </div>
              <ul className="space-y-4 text-neutral-700 mb-10 flex-grow">
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> One click setup
                  for recurring donations
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Creator
                  dashboards & analytics
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Quickest
                  onboarding on the internet
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Integrated with
                  Tributary protocol
                </li>
              </ul>
              <motion.a
                href="https://contribute.so"
                className="btn-primary text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Visit Contribute.so
              </motion.a>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              className="card flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -10 }}
            >
              <h3 className="text-3xl font-bold mb-4 text-neutral-900">
                Business Solutions
              </h3>
              <p className="text-neutral-600 mb-8">
                Custom solutions for businesses building on Tributary.
              </p>
              <div className="text-6xl font-bold gradient-text mb-8">
                Custom
              </div>
              <ul className="space-y-4 text-neutral-700 mb-10 flex-grow">
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Dedicated
                  Software, Deployment & Support
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Custom business
                  fee structures
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> White-label &
                  API integrations
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-accent text-xl">✓</span> Strategic
                  partnership opportunities
                </li>
              </ul>
              <motion.a
                href="mailto:hello@tributary.so"
                className="btn-secondary text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Sales
              </motion.a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* Trust & Social Proof */}
      <section id="testimonials" className="py-24 px-4 bg-neutral-100">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h2
            className="text-5xl md:text-6xl font-bold mb-8 gradient-text"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Loved by developers worldwide
          </motion.h2>
          <motion.p
            className="text-xl text-neutral-600 max-w-4xl mx-auto mb-20 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Hear what our community and partners are saying about Tributary.
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Testimonial 1 */}
            <motion.div
              className="card text-left"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-6">
                <div className="text-accent text-2xl">★★★★★</div>
                <span className="ml-3 text-neutral-500 text-sm font-medium">
                  5/5 stars
                </span>
              </div>
              <p className="text-neutral-700 italic mb-8 text-lg leading-relaxed">
                "Tributary has revolutionized how we handle subscriptions on
                Solana. The non-custodial approach and ease of integration are
                game-changers."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/contributeso.png"
                  alt="Fabian Schuh"
                  className="w-14 h-14 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-neutral-900">
                    Dr.-Ing. Fabian Schuh
                  </p>
                  <p className="text-sm text-neutral-600">CTO, Contribute.so</p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              className="card text-left"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-6">
                <div className="text-accent text-2xl">★★★★★</div>
                <span className="ml-3 text-neutral-500 text-sm font-medium">
                  5/5 stars
                </span>
              </div>
              <p className="text-neutral-700 italic mb-8 text-lg leading-relaxed">
                "Finally, a robust solution for recurring payments on Solana
                that doesn't compromise on security or user experience. Highly
                recommend!"
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/2.png"
                  alt="Corinna Abdel-Ibra"
                  className="w-14 h-14 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-neutral-900">
                    Corinna Abdel-Ibra
                  </p>
                  <p className="text-sm text-neutral-600">Founder, Allowly</p>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              className="card text-left"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-6">
                <div className="text-accent text-2xl">★★★★★</div>
                <span className="ml-3 text-neutral-500 text-sm font-medium">
                  5/5 stars
                </span>
              </div>
              <p className="text-neutral-700 italic mb-8 text-lg leading-relaxed">
                "Our engineers were able to integrate Tributary SDK for
                (milestone) installment payments in a matter of days, while
                constantly getting on-the-spot support from the team. Now our
                cash loans are tracked onchain with users able to repay
                automatically. That's UX done right."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/yumi-finance.png"
                  alt="Vladislav Lenskii"
                  className="w-14 h-14 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-neutral-900">
                    MVladislav Lenskii
                  </p>
                  <p className="text-sm text-neutral-600">
                    Founder, Yumi Finance
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="pt-20 px-4 bg-neutral-100"
          >
            <div className="max-w-7xl mx-auto text-center">
              <motion.p
                className="text-neutral-600 text-xl mb-12"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                Trusted by innovative projects and developers on Solana
              </motion.p>
              <motion.div
                className="flex flex-wrap justify-center items-center gap-x-20 gap-y-10"
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <motion.span
                  className="text-primary font-bold text-2xl"
                  whileHover={{ scale: 1.1 }}
                >
                  Solana
                </motion.span>
                <motion.span
                  className="text-primary font-bold text-2xl"
                  whileHover={{ scale: 1.1 }}
                >
                  DeFi Protocols
                </motion.span>
                <motion.span
                  className="text-primary font-bold text-2xl"
                  whileHover={{ scale: 1.1 }}
                >
                  SaaS Platforms
                </motion.span>
                <motion.span
                  className="text-primary font-bold text-2xl"
                  whileHover={{ scale: 1.1 }}
                >
                  Content Creators
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-neutral-600 leading-relaxed">
              Find answers to the most common questions about Tributary.
            </p>
          </motion.div>

          <div className="space-y-8">
            {/* FAQ Item 1 */}
            <motion.details
              className="group card cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <summary className="flex justify-between items-center font-bold text-xl text-neutral-900 hover:text-primary transition-colors">
                What is Tributary?
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
