import AOS from "aos";
import feather from "feather-icons";

import "./App.css";

feather.replace();
AOS.init();

function App() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 max-w-6xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">Automated</span> Crypto Subscriptions
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
          Set up recurring payments on Solana with USDC or any SPL token. Never
          miss a payment again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-all">
            Subscribe to Mailing List
          </button>
          <button className="border border-blue-600 text-blue-400 hover:bg-blue-900/30 font-medium py-3 px-8 rounded-lg transition-all">
            Learn How It Works
          </button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 p-6 rounded-xl">
            <div className="text-blue-400 mb-4">
              <i data-feather="clock" className="w-8 h-8"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Time-Saving</h3>
            <p className="text-gray-300">
              Automate your recurring payments and never worry about manual
              transactions again.
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl">
            <div className="text-purple-400 mb-4">
              <i data-feather="shield" className="w-8 h-8"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Secure</h3>
            <p className="text-gray-300">
              Built on Solana's high-performance blockchain with delegated token
              account permissions.
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl">
            <div className="text-green-400 mb-4">
              <i data-feather="zap" className="w-8 h-8"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Efficient</h3>
            <p className="text-gray-300">
              Low-cost transactions with instant settlement, perfect for
              recurring payments.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="bg-slate-800/50 p-8 rounded-xl">
          <h2 className="text-3xl font-bold mb-6 gradient-text">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-gray-300 mb-4">
                Solana's token accounts support delegated access through
                Associated Token Accounts (ATAs). When you approve a
                subscription, you're granting a delegate permission to withdraw
                up to a specified amount from your account at regular intervals.
              </p>
              <p className="text-gray-300 mb-4">
                Our open-source smart contract acts as this delegate,
                automatically executing payments according to the schedule you
                set (weekly, monthly, etc.).
              </p>
              <p className="text-gray-300">
                You maintain full control - you can cancel or modify the
                subscription at any time by revoking the delegate permission.
              </p>
            </div>
            <div className="bg-slate-900 p-6 rounded-lg">
              <pre className="text-sm text-green-400 overflow-x-auto">
                {`// Example subscription setup
const subscription = await program.methods
  .createSubscription(
    new anchor.BN(amount), // Amount per interval
    interval, // WEEKLY or MONTHLY
    merchantWallet // Recipient address
  )
  .accounts({
    payer: userWallet,
    payerAta: userAta,
  })
  .rpc();`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Automate Your Payments?
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Join our early access program and be the first to experience seamless
          crypto subscriptions.
        </p>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-all">
          Get Early Access
        </button>
      </section>
    </div>
  );
}

export default App;
