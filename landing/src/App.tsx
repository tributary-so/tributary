import { useEffect } from "react";
import { motion } from "framer-motion";
import logo from "./assets/logo.png";
import CodeBlock from "./components/CodeBlock";

function App() {
  useEffect(() => {
    // No longer using feather icons or AOS, so these can be removed or replaced with modern alternatives
    // AOS.init();
    // feather.replace();
  }, []);

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
          <nav className="hidden md:flex space-x-8">
            <motion.a
              href="#features"
              className="text-neutral-700 hover:text-primary transition-colors font-medium"
              whileHover={{ scale: 1.1 }}
            >
              Features
            </motion.a>
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
            Tributary brings Web2's subscription simplicity to Web3. Users
            approve once, payments flow seamlessly and securely, directly from
            their token accounts.
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
          {/* Product Showcase */}
          <motion.div
            className="relative w-full max-w-5xl mx-auto glass rounded-3xl p-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <img
              src="/product-screenshot.png"
              alt="Product Screenshot"
              className="w-full h-auto rounded-2xl shadow-lg"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Trust & Social Proof */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="py-20 px-4 bg-neutral-100"
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
      </motion.section>

      {/* Benefits Section */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
              Built for the future of Web3 payments
            </h2>
            <p className="text-xl text-neutral-600 max-w-4xl mx-auto leading-relaxed">
              Everything you need to implement subscription payments that users
              actually want to use, with unparalleled transparency and control.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-electric mb-8 text-6xl">⚡</div>
              <h3 className="text-2xl font-bold mb-6 text-neutral-900">
                Truly Automated
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Set up once and forget. Payments execute automatically according
                to smart contract rules users agreed to, without manual
                intervention.
              </p>
            </motion.div>
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-accent mb-8 text-6xl">🔒</div>
              <h3 className="text-2xl font-bold mb-6 text-neutral-900">
                Non-Custodial & Secure
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Built on Solana with delegated token permissions. Users maintain
                full custody of their funds with transparent, auditable smart
                contracts.
              </p>
            </motion.div>
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-primary mb-8 text-6xl">🚀</div>
              <h3 className="text-2xl font-bold mb-6 text-neutral-900">
                Lightning Fast & Low Cost
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Leverage Solana's speed and sub-cent transaction costs. Instant
                payment processing perfect for micro-subscriptions and global
                reach.
              </p>
            </motion.div>
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-electric mb-8 text-6xl">💻</div>
              <h3 className="text-2xl font-bold mb-6 text-neutral-900">
                Developer First
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Simple APIs, comprehensive SDKs (TypeScript, React), and
                detailed documentation. Integrate subscription payments in
                minutes, not weeks.
              </p>
            </motion.div>
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-accent mb-8 text-6xl">⚙️</div>
              <h3 className="text-2xl font-bold mb-6 text-neutral-900">
                Flexible Payment Policies
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Support multiple payment types: subscriptions, installments,
                usage-based billing, and more. Adapt to any Web3 business model.
              </p>
            </motion.div>
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ y: -10 }}
            >
              <div className="text-primary mb-8 text-6xl">🤝</div>
              <h3 className="text-2xl font-bold mb-6 text-neutral-900">
                Full User Control
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Users can pause, modify, or cancel subscriptions anytime.
                Complete transparency with payment history and upcoming charges.
              </p>
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

          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center mb-20">
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
                    <p className="text-neutral-600 text-lg leading-relaxed">
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
                    <p className="text-neutral-600 text-lg leading-relaxed">
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
                    <p className="text-neutral-600 text-lg leading-relaxed">
                      Funds transfer directly from the user's token account to
                      the recipient's account. No escrow, no risk – just
                      reliable, automated payments with full transparency.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            <motion.div
              className="w-full max-w-full"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <CodeBlock
                title="React SDK Integration Example"
                language="ts"
                code={`import { SubscriptionButton, PaymentInterval } from '@tributary-so/sdk-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<SubscriptionButton
  amount={new BN(10_000_000)} // 10 USDC
  token={new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')}
  recipient={PAYMENT_RECIPIENT_PUBLIC_KEY}
  gateway={PAYMENT_GATEWAY_PUBLIC_KEY}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Premium subscription - Widget Demo"
  label="Subscribe for $10/month"
  executeImmediately={true}
  className="bg-primary hover:bg-secondary text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>

// 🎉 That's it! Payments now flow automatically`}
              />
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
                  src="testimony/1.png"
                  alt="Alice Johnson"
                  className="w-14 h-14 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-neutral-900">Alice Johnson</p>
                  <p className="text-sm text-neutral-600">
                    Founder, Solana SaaS
                  </p>
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
                "The developer experience with Tributary's SDK is fantastic. We
                integrated our subscription model in a fraction of the time we
                expected."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/2.png"
                  alt="Michael Scott"
                  className="w-14 h-14 rounded-full mr-4 shadow-md"
                />
                <div>
                  <p className="font-bold text-neutral-900">Michael Scott</p>
                  <p className="text-sm text-neutral-600">
                    Lead Dev, DeFi Protocol
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
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
                    className="hover:text-electric transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.tributary.so"
                    className="hover:text-electric transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/tributary-so/tributary/tree/main/sdk"
                    className="hover:text-electric transition-colors"
                  >
                    SDK
                  </a>
                </li>
                <li>
                  <a
                    href="https://app.tributary.so"
                    className="hover:text-electric transition-colors"
                  >
                    Dashboard
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
                    href="https://github.com/tributary-so"
                    className="hover:text-electric transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/tributaryso"
                    className="hover:text-electric transition-colors"
                  >
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/tributaryso"
                    className="hover:text-electric transition-colors"
                  >
                    X (Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/tributaryso"
                    className="hover:text-electric transition-colors"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@tributary.so"
                    className="hover:text-electric transition-colors"
                  >
                    Contact
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
