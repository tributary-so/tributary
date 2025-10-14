import { useEffect } from "react";
import AOS from "aos";
import feather from "feather-icons";
import logo from "./assets/logo.png";

import "./App.css";

AOS.init();

function App() {
  useEffect(() => {
    feather.replace();
  }, []);
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Work in Progress Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-3 px-4">
        <p className="text-sm md:text-base font-medium">
          🎉 Started for Colosseum CyberPunk Hackathon - Work in Progress 🚧
        </p>
      </div>

      {/* Header/Navigation */}
      <header className="py-6 px-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 text-2xl font-bold gradient-text">
            <img src={logo} alt="Tributary Logo" className="h-8 w-8" />
            Tributary
          </div>
          <nav className="hidden md:flex space-x-8">
            <a
              href="#features"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-300 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#developer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Developer
            </a>
          </nav>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Bringing <span className="gradient-text">Web2's subscription</span>
            <br />
            simplicity to <span className="gradient-text">Web3</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Enable truly automated recurring payments on Solana. Users sign
            once, payments flow seamlessly. No manual transactions, no deposits
            into contracts - payments straight from token accounts with complete
            user control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-all text-lg">
              Start Building
            </button>
            <button className="border border-blue-600 text-blue-400 hover:bg-blue-900/30 font-semibold py-4 px-8 rounded-lg transition-all text-lg">
              View Documentation
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center">
          <p className="text-gray-400 mb-8">
            Trusted by developers building the future of recurring payments
          </p>
          <div className="flex justify-center items-center space-x-12 opacity-60">
            <div className="text-gray-400 font-semibold">Solana</div>
            <div className="text-gray-400 font-semibold">DeFi Protocols</div>
            <div className="text-gray-400 font-semibold">SaaS Platforms</div>
            <div className="text-gray-400 font-semibold">Content Creators</div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Web3 subscriptions are{" "}
                <span className="text-red-400">broken</span>
              </h2>
              <ul className="space-y-4 text-lg text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-400 mr-3">✗</span>
                  Manual transaction signing every payment period
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3">✗</span>
                  Lock funds in smart contracts with withdrawal risks
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3">✗</span>
                  Complex user experience hurts conversion rates
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3">✗</span>
                  Limited payment flexibility and control
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Tributary makes them{" "}
                <span className="gradient-text">simple</span>
              </h2>
              <ul className="space-y-4 text-lg text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">✓</span>
                  Sign once, automate forever - true set-and-forget
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">✓</span>
                  Payments directly from user's token account
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">✓</span>
                  Familiar Web2 UX with Web3 transparency
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">✓</span>
                  Full user control - cancel or modify anytime
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">
            Built for the future of payments
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to implement subscription payments that users
            actually want to use
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 p-8 rounded-xl border border-gray-700">
            <div className="text-blue-400 mb-6">
              <i data-feather="clock" className="w-10 h-10"></i>
            </div>
            <h3 className="text-xl font-bold mb-4">Truly Automated</h3>
            <p className="text-gray-300 leading-relaxed">
              Set up once and forget. No manual intervention required. Payments
              execute automatically according to smart contract rules users
              agreed to.
            </p>
          </div>
          <div className="bg-slate-800/50 p-8 rounded-xl border border-gray-700">
            <div className="text-purple-400 mb-6">
              <i data-feather="shield" className="w-10 h-10"></i>
            </div>
            <h3 className="text-xl font-bold mb-4">Trustless & Secure</h3>
            <p className="text-gray-300 leading-relaxed">
              Built on Solana with delegated token permissions. Users maintain
              full custody of their funds with transparent, auditable smart
              contracts.
            </p>
          </div>
          <div className="bg-slate-800/50 p-8 rounded-xl border border-gray-700">
            <div className="text-green-400 mb-6">
              <i data-feather="zap" className="w-10 h-10"></i>
            </div>
            <h3 className="text-xl font-bold mb-4">Lightning Fast</h3>
            <p className="text-gray-300 leading-relaxed">
              Leverage Solana's speed and low costs. Instant payment processing
              with minimal fees - perfect for micro-subscriptions and global
              reach.
            </p>
          </div>
          <div className="bg-slate-800/50 p-8 rounded-xl border border-gray-700">
            <div className="text-orange-400 mb-6">
              <i data-feather="code" className="w-10 h-10"></i>
            </div>
            <h3 className="text-xl font-bold mb-4">Developer First</h3>
            <p className="text-gray-300 leading-relaxed">
              Simple APIs, comprehensive SDKs, and detailed documentation.
              Integrate subscription payments in minutes, not weeks.
            </p>
          </div>
          <div className="bg-slate-800/50 p-8 rounded-xl border border-gray-700">
            <div className="text-cyan-400 mb-6">
              <i data-feather="settings" className="w-10 h-10"></i>
            </div>
            <h3 className="text-xl font-bold mb-4">Flexible Policies</h3>
            <p className="text-gray-300 leading-relaxed">
              Support multiple payment types: subscriptions, installments,
              usage-based billing, and more. Adapt to any business model.
            </p>
          </div>
          <div className="bg-slate-800/50 p-8 rounded-xl border border-gray-700">
            <div className="text-pink-400 mb-6">
              <i data-feather="users" className="w-10 h-10"></i>
            </div>
            <h3 className="text-xl font-bold mb-4">User Control</h3>
            <p className="text-gray-300 leading-relaxed">
              Users can pause, modify, or cancel subscriptions anytime. Complete
              transparency with payment history and upcoming charges.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 gradient-text">
              How It Works
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Leveraging Solana's native token delegation for seamless recurring
              payments
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      User Approves Subscription
                    </h3>
                    <p className="text-gray-300">
                      User signs a single transaction granting delegate
                      permissions to your smart contract for a specific token
                      amount and payment schedule.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Smart Contract Executes
                    </h3>
                    <p className="text-gray-300">
                      Our smart contract automatically processes payments
                      according to the agreed schedule - weekly, monthly, or
                      custom intervals.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Payments Flow Seamlessly
                    </h3>
                    <p className="text-gray-300">
                      Funds transfer directly from user's account to your
                      account. No escrow, no risk - just reliable, automated
                      payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-lg border border-gray-700">
              <pre className="text-sm text-green-400 overflow-x-auto">
                {`import { SubscriptionButton } from '@tributary-so/sdk-react'
import { PaymentInterval } from '@tributary-so/sdk-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<SubscriptionButton
  amount={new BN(10_000_000)}
  token={new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')}
  recipient={PAYMENT_RECIPIENT}
  gateway={PAYMENT_GATEWAY_PUBLIC_KEY}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Premium subscription - Widget Demo"
  label="Subscribe for $10/month"
  executeImmediately={true}
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>

// That's it! Payments now flow automatically`}
              </pre>
            </div>
          </div>

          {/* Use Cases */}
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-8">
              Perfect for any recurring revenue model
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-700">
                <div className="text-blue-400 mb-4">
                  <i data-feather="monitor" className="w-8 h-8 mx-auto"></i>
                </div>
                <h4 className="font-semibold mb-2">SaaS Platforms</h4>
                <p className="text-sm text-gray-300">
                  Monthly/annual software subscriptions
                </p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-700">
                <div className="text-purple-400 mb-4">
                  <i data-feather="video" className="w-8 h-8 mx-auto"></i>
                </div>
                <h4 className="font-semibold mb-2">Content Creators</h4>
                <p className="text-sm text-gray-300">
                  Fan subscriptions and premium content
                </p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-700">
                <div className="text-green-400 mb-4">
                  <i data-feather="trending-up" className="w-8 h-8 mx-auto"></i>
                </div>
                <h4 className="font-semibold mb-2">DeFi Protocols</h4>
                <p className="text-sm text-gray-300">
                  Strategy fees and premium features
                </p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-lg border border-gray-700">
                <div className="text-orange-400 mb-4">
                  <i
                    data-feather="shopping-cart"
                    className="w-8 h-8 mx-auto"
                  ></i>
                </div>
                <h4 className="font-semibold mb-2">E-commerce</h4>
                <p className="text-sm text-gray-300">
                  Product subscriptions and memberships
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section id="developer" className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">
            Built by developers, for developers
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to integrate subscription payments into your
            application
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-semibold mb-6">Quick Start</h3>
            <div className="bg-slate-900 p-6 rounded-lg border border-gray-700">
              <pre className="text-sm text-green-400 overflow-x-auto">
                {`npm install @tributary-so/sdk

import { Tributary } from '@tributary-so/sdk';

const tributary = new Tributary({
  connection: new Connection(SOLANA_RPC),
  wallet: userWallet
});

// Create subscription
const sub = await tributary.createSubscription({
  amount: new BN(5_000_000), // 5 USDC
  interval: PaymentInterval.Monthly,
  recipient: 'your-wallet-address'
});`}
              </pre>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-semibold mb-6">Key Features</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1">✓</span>
                <div>
                  <strong>TypeScript SDK:</strong> Full type safety and
                  IntelliSense support
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1">✓</span>
                <div>
                  <strong>Comprehensive docs:</strong> Examples, guides, and API
                  reference
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1">✓</span>
                <div>
                  <strong>Open source:</strong> Auditable, transparent,
                  community-driven
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1">✓</span>
                <div>
                  <strong>Webhook support:</strong> Real-time payment
                  notifications
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1">✓</span>
                <div>
                  <strong>Dashboard:</strong> Monitor subscriptions and
                  analytics
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to revolutionize your recurring payments?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join the future of Web3 subscriptions. Give your users the seamless
            payment experience they expect, with the transparency they deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition-all text-lg">
              Get Started Now
            </button>
            <button className="bg-white text-blue-600 font-bold py-4 px-8 rounded-lg hover:bg-gray-100 transition-all text-lg">
              Read Documentation
            </button>
          </div>
          <p className="text-sm mt-6 opacity-75">
            Free to use • Open source • Built on Solana
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold gradient-text mb-4">
                Tributary
              </div>
              <p className="text-gray-300 text-sm">
                Bringing Web2's subscription simplicity to Web3 with truly
                automated recurring payments on Solana.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    SDK
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API Reference
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Examples
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            © 2024 Tributary. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
