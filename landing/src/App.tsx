import { useEffect } from "react";
import logo from "./assets/logo.png";
import CodeBlock from "./components/CodeBlock";

function App() {
  useEffect(() => {
    // No longer using feather icons or AOS, so these can be removed or replaced with modern alternatives
    // AOS.init();
    // feather.replace();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white shadow-sm py-4 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <img src={logo} alt="Tributary Logo" className="h-8 w-8" />
            <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent font-bold">
              Tributary
            </span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a
              href="#features"
              className="text-neutral-600 hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-neutral-600 hover:text-primary transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-neutral-600 hover:text-primary transition-colors"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-neutral-600 hover:text-primary transition-colors"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              className="text-neutral-600 hover:text-primary transition-colors"
            >
              FAQ
            </a>
          </nav>
          <a
            href="https://app.tributary.so"
            className="bg-primary hover:bg-secondary text-white px-4 py-2 md:px-6 md:py-2 rounded-lg transition-all font-semibold shadow-md text-sm md:text-base"
          >
            Open App
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 text-center bg-gradient-to-br from-white to-neutral-100">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-neutral-900">
            Automated Recurring Payments for the{" "}
            <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent font-bold">
              Solana
            </span>{" "}
            Ecosystem
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Tributary brings Web2's subscription simplicity to Web3. Users
            approve once, payments flow seamlessly and securely, directly from
            their token accounts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="https://docs.tributary.so/how"
              className="bg-primary hover:bg-secondary text-white font-semibold py-4 px-10 rounded-full transition-all text-lg shadow-lg"
            >
              Start Building
            </a>
            <a
              href="https://docs.tributary.so"
              className="border border-primary text-primary hover:bg-primary hover:text-white font-semibold py-4 px-10 rounded-full transition-all text-lg shadow-md"
            >
              View Documentation
            </a>
          </div>
          {/* Product Showcase Placeholder */}
          <div className="relative w-full max-w-4xl mx-auto bg-neutral-200 border-neutral-300">
            <img
              src="/product-screenshot.png"
              alt="Product Screenshot"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Trust & Social Proof */}
      <section className="py-16 px-4 bg-neutral-100">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-neutral-500 text-lg mb-8">
            Trusted by innovative projects and developers on Solana
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-70">
            {/* Replace with actual logos */}
            <span className="text-neutral-700 font-semibold text-xl">
              Solana
            </span>
            <span className="text-neutral-700 font-semibold text-xl">
              DeFi Protocols
            </span>
            <span className="text-neutral-700 font-semibold text-xl">
              SaaS Platforms
            </span>
            <span className="text-neutral-700 font-semibold text-xl">
              Content Creators
            </span>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-neutral-900">
              Built for the future of Web3 payments
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Everything you need to implement subscription payments that users
              actually want to use, with unparalleled transparency and control.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
              <div className="text-primary mb-6 text-5xl">⚡</div>{" "}
              {/* Icon placeholder */}
              <h3 className="text-2xl font-bold mb-4 text-neutral-900">
                Truly Automated
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Set up once and forget. Payments execute automatically according
                to smart contract rules users agreed to, without manual
                intervention.
              </p>
            </div>
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
              <div className="text-accent mb-6 text-5xl">🔒</div>{" "}
              {/* Icon placeholder */}
              <h3 className="text-2xl font-bold mb-4 text-neutral-900">
                Non-Custodial & Secure
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Built on Solana with delegated token permissions. Users maintain
                full custody of their funds with transparent, auditable smart
                contracts.
              </p>
            </div>
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
              <div className="text-secondary mb-6 text-5xl">🚀</div>{" "}
              {/* Icon placeholder */}
              <h3 className="text-2xl font-bold mb-4 text-neutral-900">
                Lightning Fast & Low Cost
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Leverage Solana's speed and sub-cent transaction costs. Instant
                payment processing perfect for micro-subscriptions and global
                reach.
              </p>
            </div>
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
              <div className="text-primary mb-6 text-5xl">💻</div>{" "}
              {/* Icon placeholder */}
              <h3 className="text-2xl font-bold mb-4 text-neutral-900">
                Developer First
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Simple APIs, comprehensive SDKs (TypeScript, React), and
                detailed documentation. Integrate subscription payments in
                minutes, not weeks.
              </p>
            </div>
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
              <div className="text-accent mb-6 text-5xl">⚙️</div>{" "}
              {/* Icon placeholder */}
              <h3 className="text-2xl font-bold mb-4 text-neutral-900">
                Flexible Payment Policies
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Support multiple payment types: subscriptions, installments,
                usage-based billing, and more. Adapt to any Web3 business model.
              </p>
            </div>
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-sm text-center">
              <div className="text-secondary mb-6 text-5xl">🤝</div>{" "}
              {/* Icon placeholder */}
              <h3 className="text-2xl font-bold mb-4 text-neutral-900">
                Full User Control
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Users can pause, modify, or cancel subscriptions anytime.
                Complete transparency with payment history and upcoming charges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-neutral-900">
              How Tributary Works
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Leveraging Solana's native token delegation for seamless, secure,
              and truly automated recurring payments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-16">
            <div>
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md self-start sm:self-auto">
                    1
                  </div>
                  <div className="w-full">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-neutral-900">
                      User Approves Subscription
                    </h3>
                    <p className="text-neutral-600 text-base md:text-lg break-words">
                      User signs a single transaction granting delegate
                      permissions to Tributary's smart contract for a specific
                      token amount and payment schedule. Funds remain in their
                      wallet.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md self-start sm:self-auto">
                    2
                  </div>
                  <div className="w-full">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-neutral-900">
                      Tributary Executes Payment
                    </h3>
                    <p className="text-neutral-600 text-base md:text-lg break-words">
                      Our permissionless smart contract automatically processes
                      payments according to the agreed schedule (e.g., weekly,
                      monthly, custom intervals) when due.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md self-start sm:self-auto">
                    3
                  </div>
                  <div className="w-full">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-neutral-900">
                      Funds Flow to Recipient
                    </h3>
                    <p className="text-neutral-600 text-base md:text-lg break-words">
                      Funds transfer directly from the user's token account to
                      the recipient's account. No escrow, no risk – just
                      reliable, automated payments with full transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full max-w-full overflow-hidden">
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
            </div>
          </div>

          {/* Use Cases */}
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-4xl font-bold mb-8 text-neutral-900">
              Perfect for any recurring revenue model on Solana
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
                <div className="text-primary mb-4 text-4xl">💡</div>{" "}
                {/* Icon placeholder */}
                <h4 className="font-semibold mb-2 text-neutral-900">
                  SaaS Platforms
                </h4>
                <p className="text-sm text-neutral-600">
                  Monthly/annual software subscriptions, API access fees.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
                <div className="text-accent mb-4 text-4xl">🎨</div>{" "}
                {/* Icon placeholder */}
                <h4 className="font-semibold mb-2 text-neutral-900">
                  Content Creators
                </h4>
                <p className="text-sm text-neutral-600">
                  Fan subscriptions, premium content access, recurring
                  donations.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
                <div className="text-secondary mb-4 text-4xl">📈</div>{" "}
                {/* Icon placeholder */}
                <h4 className="font-semibold mb-2 text-neutral-900">
                  DeFi Protocols
                </h4>
                <p className="text-sm text-neutral-600">
                  Strategy fees, premium feature access, protocol subscriptions.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
                <div className="text-primary mb-4 text-4xl">🛒</div>{" "}
                {/* Icon placeholder */}
                <h4 className="font-semibold mb-2 text-neutral-900">
                  E-commerce & Memberships
                </h4>
                <p className="text-sm text-neutral-600">
                  Product subscriptions, DAO memberships, exclusive access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-neutral-900">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Tributary is a fundamental infrastructure protocol, charging a 1%
              protocol fee to operate and improve the ecosystem. Businesses
              built on top of Tributary may charge their own separate fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-lg flex flex-col">
              <h3 className="text-3xl font-bold mb-4 text-neutral-900">
                Starter
              </h3>
              <p className="text-neutral-600 mb-6">
                Ideal for individuals and small projects getting started.
              </p>
              <div className="text-5xl font-bold text-primary mb-6">
                $0<span className="text-xl text-neutral-500">/month</span>
              </div>
              <ul className="space-y-3 text-neutral-700 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Any number of
                  subscriptions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 1% protocol fee
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Basic dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Any SPL token
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Community support
                </li>
              </ul>
              <a
                href="#"
                className="block text-center bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md"
              >
                Get Started Free
              </a>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-8 rounded-xl border-2 border-primary shadow-xl flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase text-center">
                Reference Implementation
              </div>
              <h3 className="text-3xl font-bold mb-4 text-neutral-900">
                Contribute.so
              </h3>
              <p className="text-neutral-600 mb-6">
                A ready-to-use platform built on Tributary for{" "}
                <span className="font-semibold">creators and communities</span>.
              </p>
              <div className="text-5xl font-bold text-primary mb-6">
                2.5%
                <span className="text-xl text-neutral-500">
                  {" "}
                  (business fee)
                </span>
              </div>
              <ul className="space-y-3 text-neutral-700 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> One click setup for
                  recurring donations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Creator dashboards &
                  analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Quickest onboarding
                  on the internet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Integrated with
                  Tributary protocol
                </li>
              </ul>
              <a
                href="https://contribute.so"
                className="block text-center bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md"
              >
                Visit Contribute.so
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-neutral-50 p-8 rounded-xl border border-neutral-200 shadow-lg flex flex-col">
              <h3 className="text-3xl font-bold mb-4 text-neutral-900">
                Business Solutions
              </h3>
              <p className="text-neutral-600 mb-6">
                Custom solutions for businesses building on Tributary.
              </p>
              <div className="text-5xl font-bold text-primary mb-6">Custom</div>
              <ul className="space-y-3 text-neutral-700 mb-8 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Dedicated Software,
                  Deployment & Support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Custom business fee
                  structures
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> White-label & API
                  integrations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Strategic
                  partnership opportunities
                </li>
              </ul>
              <a
                href="mailto:hello@tributary.so"
                className="block text-center bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold py-3 px-6 rounded-lg transition-all shadow-md"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-neutral-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-neutral-900">
            Loved by developers worldwide
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto mb-16">
            Hear what our community and partners are saying about Tributary.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-md text-left">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-xl">★★★★★</div>
                <span className="ml-2 text-neutral-500 text-sm">5/5 stars</span>
              </div>
              <p className="text-neutral-700 italic mb-6">
                "Tributary has revolutionized how we handle subscriptions on
                Solana. The non-custodial approach and ease of integration are
                game-changers."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/contributeso.png"
                  alt="Fabian Schuh"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-semibold text-neutral-900">
                    Dr.-Ing. Fabian Schuh
                  </p>
                  <p className="text-sm text-neutral-600">CTO, Contribute.so</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-md text-left">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-xl">★★★★★</div>
                <span className="ml-2 text-neutral-500 text-sm">5/5 stars</span>
              </div>
              <p className="text-neutral-700 italic mb-6">
                "Finally, a robust solution for recurring payments on Solana
                that doesn't compromise on security or user experience. Highly
                recommend!"
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/1.png"
                  alt="Jane Smith"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-semibold text-neutral-900">
                    Alice Johnson
                  </p>
                  <p className="text-sm text-neutral-600">
                    Founder, Solana SaaS
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-md text-left">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-xl">★★★★★</div>
                <span className="ml-2 text-neutral-500 text-sm">5/5 stars</span>
              </div>
              <p className="text-neutral-700 italic mb-6">
                "The developer experience with Tributary's SDK is fantastic. We
                integrated our subscription model in a fraction of the time we
                expected."
              </p>
              <div className="flex items-center">
                <img
                  src="testimony/2.png"
                  alt="Michael Scott"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-semibold text-neutral-900">
                    Michael Scott
                  </p>
                  <p className="text-sm text-neutral-600">
                    Lead Dev, DeFi Protocol
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-neutral-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-neutral-600">
              Find answers to the most common questions about Tributary.
            </p>
          </div>

          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <details className="group bg-neutral-50 p-6 rounded-lg border border-neutral-200 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-lg text-neutral-800">
                What is Tributary?
                <span className="group-open:rotate-180 transition-transform">
                  <svg
                    className="w-5 h-5 text-neutral-500"
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
              <p className="mt-4 text-neutral-600">
                Tributary is a Solana-native protocol enabling automated,
                non-custodial recurring payments through token delegation. It
                provides the foundational infrastructure for Web3 subscription
                services.
              </p>
            </details>

            {/* FAQ Item 2 */}
            <details className="group bg-neutral-50 p-6 rounded-lg border border-neutral-200 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-lg text-neutral-800">
                How does token delegation work?
                <span className="group-open:rotate-180 transition-transform">
                  <svg
                    className="w-5 h-5 text-neutral-500"
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
              <p className="mt-4 text-neutral-600">
                Users sign a single transaction to delegate a specific amount of
                tokens for a defined period to Tributary's smart contract. This
                allows the protocol to execute payments automatically without
                locking up funds in an escrow.
              </p>
            </details>

            {/* FAQ Item 3 */}
            <details className="group bg-neutral-50 p-6 rounded-lg border border-neutral-200 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-lg text-neutral-800">
                Is Tributary secure?
                <span className="group-open:rotate-180 transition-transform">
                  <svg
                    className="w-5 h-5 text-neutral-500"
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
              <p className="mt-4 text-neutral-600">
                Yes, Tributary is designed to be non-custodial and secure. Funds
                remain in your wallet, and the protocol only has delegated
                authority to transfer specific amounts for defined subscription
                periods. It's open-source, will undergo professional security
                audits, and allows you to revoke delegation anytime.
              </p>
            </details>

            {/* FAQ Item 4 */}
            <details className="group bg-neutral-50 p-6 rounded-lg border border-neutral-200 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-lg text-neutral-800">
                Can users cancel or modify subscriptions?
                <span className="group-open:rotate-180 transition-transform">
                  <svg
                    className="w-5 h-5 text-neutral-500"
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
              <p className="mt-4 text-neutral-600">
                Absolutely. Users have full control over their subscriptions and
                can pause, resume, or cancel them at any time through their
                wallet interface or a dApp built on Tributary.
              </p>
            </details>

            {/* FAQ Item 5 */}
            <details className="group bg-neutral-50 p-6 rounded-lg border border-neutral-200 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-lg text-neutral-800">
                How does Tributary's security compare to other protocols?
                <span className="group-open:rotate-180 transition-transform">
                  <svg
                    className="w-5 h-5 text-neutral-500"
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
              <p className="mt-4 text-neutral-600">
                Unlike protocols like x402 where private keys must be accessible
                to AI agents or bots—granting access to your entire wallet and
                all assets—Tributary limits delegation to a specific token
                (e.g., USDC) and a predefined amount. This minimizes the impact
                radius of any potential compromise, allowing private keys to
                remain cold and secure.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary to-secondary text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Ready to revolutionize your recurring payments?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90">
            Join the future of Web3 subscriptions. Give your users the seamless
            payment experience they expect, with the transparency and control
            they deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://docs.tributary.so/how"
              className="bg-white text-primary font-bold py-4 px-10 rounded-full hover:bg-neutral-100 transition-all text-lg shadow-lg"
            >
              Get Started Now
            </a>
            <a
              href="https://docs.tributary.so"
              className="border border-white text-white font-bold py-4 px-10 rounded-full hover:bg-white hover:text-primary transition-all text-lg shadow-lg"
            >
              Read Documentation
            </a>
          </div>
          <p className="text-sm mt-8 opacity-80">
            Free to use • Open source • Built on Solana
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-neutral-900 text-neutral-300 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">
                Tributary
              </div>
              <p className="text-sm leading-relaxed">
                Bringing Web2's subscription simplicity to Web3 with truly
                automated recurring payments on Solana.
              </p>
            </div>
            <div></div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.tributary.so"
                    className="hover:text-white transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/tributary-so/tributary/tree/main/sdk"
                    className="hover:text-white transition-colors"
                  >
                    SDK
                  </a>
                </li>
                <li>
                  <a
                    href="https://app.tributary.so"
                    className="hover:text-white transition-colors"
                  >
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com/tributary-so"
                    className="hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/tributaryso"
                    className="hover:text-white transition-colors"
                  >
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/tributaryso"
                    className="hover:text-white transition-colors"
                  >
                    X (Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/tributaryso"
                    className="hover:text-white transition-colors"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@tributary.so"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 mt-12 pt-8 text-center text-sm text-neutral-500">
            © 2024 Tributary. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
