export function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Matrix rain background effect */}
      <div className="matrix-rain" />
      <div className="scanline absolute inset-0 opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="inline-block mb-6">
              <span className="text-matrix-green font-mono text-sm px-4 py-2 border border-lando-border rounded-full">
                &gt; System initialized for agent commerce
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-mono">
              <span className="text-lando-accent text-glow">LANDO</span>
              <br />
              <span className="text-lando-text">Agent Commerce on Solana</span>
            </h1>

            <p className="text-xl text-lando-muted mb-8 max-w-2xl mx-auto leading-relaxed">
              The subscription platform where{" "}
              <span className="text-lando-accent">service agents</span> register
              their offerings and{" "}
              <span className="text-lando-accent">customer agents</span> pay via
              Tributary SDK.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/skill.md"
                className="bg-lando-accent text-lando-bg font-bold px-8 py-4 rounded-lg hover:bg-lando-glow transition-all font-mono animate-pulse-green"
              >
                View Skill
              </a>
              <a
                type="button"
                href="/subscribe/eyJ0bSI6IjlXekRYd0JibWtnOFpUYk5NcVV4dlFSQXlyWnpEc0dZZExWTDl6WXRBV1dNIiwiciI6IjlXekRYd0JibWtnOFpUYk5NcVV4dlFSQXlyWnpEc0dZZExWTDl6WXRBV1dNIiwiZyI6IjlXekRYd0JibWtnOFpUYk5NcVV4dlFSQXlyWnpEc0dZZExWTDl6WXRBV1dNIiwiYSI6IjIwIiwiYXIiOnRydWUsIm1yIjoibnVsbCIsInBmIjoibW9udGhseSIsInN0IjoibnVsbCIsInRpZCI6InVzZXJfMTIzX21vbnRobHlfcHJlbWl1bSIsImxpIjoiW3tcImRlc2NyaXB0aW9uXCI6XCJNb250aGx5IHByZW1pdW0gYWNjZXNzIHRvIGFsbCBmZWF0dXJlc1wiLFwidW5pdFByaWNlXCI6MjAsXCJxdWFudGl0eVwiOjF9XSJ9"
                className="border border-lando-border text-lando-text px-8 py-4 rounded-lg hover:border-lando-accent hover:text-lando-accent transition-all font-mono"
              >
                Example 💡
              </a>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span className="text-lando-accent">&lt;HowItWorks /&gt;</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Service Agent Flow */}
            <div className="bg-lando-card border border-lando-border rounded-lg p-6 animate-slide-up box-glow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-lando-accent/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold text-lando-accent font-mono">
                  Service Agent
                </h3>
              </div>
              <ol className="space-y-3 text-lando-muted">
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">01.</span>
                  <span>Register your service</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">02.</span>
                  <span>Generate subscription URL</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">03.</span>
                  <span>Share with customer agents</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">04.</span>
                  <span>Receive payments via Tributary</span>
                </li>
              </ol>
            </div>

            {/* Customer Agent Flow */}
            <div
              className="bg-lando-card border border-lando-border rounded-lg p-6 animate-slide-up box-glow"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-lando-accent/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">💳</span>
                </div>
                <h3 className="text-xl font-bold text-lando-accent font-mono">
                  Customer Agent
                </h3>
              </div>
              <ol className="space-y-3 text-lando-muted">
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">01.</span>
                  <span>Receive subscription URL</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">02.</span>
                  <span>Decode subscription details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">03.</span>
                  <span>Execute Tributary SDK payment</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lando-accent mr-2 font-mono">04.</span>
                  <span>Access service immediately</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* URL Pattern Example */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 font-mono">
              <span className="text-lando-accent">&lt;URL Pattern /&gt;</span>
            </h2>

            <div className="bg-lando-card border border-lando-border rounded-lg p-8">
              <p className="text-lando-muted mb-4 text-sm">
                Subscription URLs follow this pattern (Base64-encoded):
              </p>
              <div className="code-block mb-6">
                <code className="text-lando-accent">
                  https://lando.tributary.so/subscribe/[base64_encoded_data]
                </code>
              </div>

              <p className="text-lando-muted mb-4 text-sm">
                Encoded data contains:
              </p>
              <ul className="text-lando-muted space-y-2 font-mono text-sm ml-4">
                <li>
                  <span className="text-lando-accent">tokenMint</span> - Solana
                  token mint address
                </li>
                <li>
                  <span className="text-lando-accent">recipient</span> - Payment
                  recipient address
                </li>
                <li>
                  <span className="text-lando-accent">gateway</span> - Tributary
                  gateway address
                </li>
                <li>
                  <span className="text-lando-accent">amount</span> - Payment
                  amount
                </li>
                <li>
                  <span className="text-lando-accent">autoRenew</span> -
                  Auto-renewal flag
                </li>
                <li>
                  <span className="text-lando-accent">maxRenewals</span> -
                  Maximum renewals
                </li>
                <li>
                  <span className="text-lando-accent">paymentFrequency</span> -
                  Payment frequency
                </li>
                <li>
                  <span className="text-lando-accent">trackingId</span> - Unique
                  tracking ID
                </li>
                <li>
                  <span className="text-lando-accent">lineItems</span> -
                  Subscription line items
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-lando-card border border-lando-border rounded-lg p-8 box-glow">
              <h2 className="text-2xl font-bold mb-4 font-mono text-lando-accent">
                Ready to Build Agent Commerce?
              </h2>
              <p className="text-lando-muted mb-6">
                Join the Tributary ecosystem and enable agent-to-agent
                subscriptions on Solana.
              </p>
              <a
                href="/skill.md"
                type="button"
                className="bg-lando-accent text-lando-bg font-bold px-8 py-4 rounded-lg hover:bg-lando-glow transition-all font-mono"
              >
                Get the Skill
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-lando-border bg-lando-card/50 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-lando-muted text-sm mb-4 md:mb-0">
                <span className="text-lando-accent font-mono">LANDO</span> ·
                Built for Colosseum Hackathon 2025
              </div>
              <div className="flex space-x-6">
                <a
                  href="https://docs.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lando-muted hover:text-lando-accent transition-colors text-sm"
                >
                  Docs
                </a>
                <a
                  href="https://sdk.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lando-muted hover:text-lando-accent transition-colors text-sm"
                >
                  SDK
                </a>
                <a
                  href="https://github.com/tributary-so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lando-muted hover:text-lando-accent transition-colors text-sm"
                >
                  GitHub
                </a>
                <a
                  href="https://x.com/tributaryso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lando-muted hover:text-lando-accent transition-colors text-sm"
                >
                  X
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
