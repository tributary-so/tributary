export function Landing() {
  return (
    <section className="py-12">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-4 text-left">
          <div className="inline-block mb-2">
            <span className="text-matrix-green font-mono text-sm px-4 py-2 border border-lando-border">
              &gt; Stripe for AI agents
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-snug tracking-tighter font-mono">
            <span className="text-lando-accent">LANDO</span>
            <br />
            <span className="text-lando-text">Agent Commerce on Solana</span>
          </h1>
          <p className="text-xl text-lando-muted">
            <span className="text-lando-accent">Service agents</span> generate
            subscription URLs.{" "}
            <span className="text-lando-accent">Customer agents</span> pay via
            Tributary.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="/skill.md"
              className="bg-lando-accent text-lando-bg font-bold px-8 py-4 hover:bg-lando-glow transition-all font-mono text-sm"
            >
              Get the Skill
            </a>
            <a
              href="/#/subscribe/eyJtIjoic3Vic2NyaXB0aW9uIiwidG0iOiJFUGpGV2RkNUF1ZnFTU3FlTTJxTjF4enliYXBDOEc0d0VHR2tad3lURHQxdiIsInIiOiJIaHExVDhBSGo0UEg0ZmJVVnRrcVZIRjhNeUY3eHZCU2JBODd2TFV5ZFNUbiIsImEiOiIxMCIsInRpZCI6InRyaWJfMTc3MzI5ODY4NDU3OF9hdWw1MTRiOHAiLCJzdSI6Im51bGwiLCJjdSI6Im51bGwiLCJnIjoiNm50bTVyV3FERmVmRVQ4UkZ5WlY3M0ZjZHF4UE1iYzdUc28zcENNV2s0dzQiLCJhciI6dHJ1ZSwibXIiOiIxMiIsInBmIjoid2Vla2x5Iiwic3QiOiJudWxsIiwibGkiOiJbXSJ9"
              className="border border-lando-border text-lando-text px-8 py-4 hover:border-lando-accent hover:text-lando-accent transition-all font-mono text-sm"
            >
              Try Demo
            </a>
          </div>
        </div>
        <div className="flex flex-col justify-center space-y-4">
          <div className="space-y-2">
            <div className="font-mono text-sm text-lando-muted uppercase tracking-[0.12em]">
              Network
            </div>
            <div className="text-2xl font-bold flex items-center gap-2 text-lando-text">
              <img
                src="/solana-logomark.svg"
                className="h-5 w-5"
                alt="Solana"
              />
              Solana
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-sm text-lando-muted uppercase tracking-[0.12em]">
              Type
            </div>
            <div className="text-2xl font-bold text-lando-text">
              Agent Commerce
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-sm text-lando-muted uppercase tracking-[0.12em]">
              Integration
            </div>
            <div className="text-2xl font-bold text-lando-text">
              Tributary SDK
            </div>
          </div>
        </div>
      </div>

      <div
        className="font-mono text-sm text-lando-muted/30 select-none py-8"
        aria-hidden="true"
      >
        //
      </div>

      <div className="mb-8 max-w-2xl space-y-3">
        <h2 className="text-xl font-semibold text-lando-accent font-mono">
          The Flow
        </h2>
        <p className="text-lando-muted">How agents interact with Lando</p>
      </div>

      <div className="border border-lando-border bg-lando-card p-8 space-y-4">
        <ol className="space-y-4">
          <li className="flex items-start">
            <div className="shrink-0 w-10 h-10 bg-lando-accent/20 flex items-center justify-center mr-4 font-mono text-lando-accent font-bold">
              1
            </div>
            <div>
              <span className="text-lando-text font-semibold">
                Service agent generates subscription URL
              </span>
              <p className="text-sm mt-1 text-lando-muted">
                Using the Lando skill
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="shrink-0 w-10 h-10 bg-lando-accent/20 flex items-center justify-center mr-4 font-mono text-lando-accent font-bold">
              2
            </div>
            <div>
              <span className="text-lando-text font-semibold">
                Customer agent receives URL and visits page
              </span>
            </div>
          </li>
          <li className="flex items-start">
            <div className="shrink-0 w-10 h-10 bg-lando-accent/20 flex items-center justify-center mr-4 font-mono text-lando-accent font-bold">
              3
            </div>
            <div>
              <span className="text-lando-text font-semibold">
                Lando decodes URL and displays custom SKILL.md
              </span>
            </div>
          </li>
          <li className="flex items-start">
            <div className="shrink-0 w-10 h-10 bg-lando-accent/20 flex items-center justify-center mr-4 font-mono text-lando-accent font-bold">
              4
            </div>
            <div>
              <span className="text-lando-text font-semibold">
                Customer agent follows SKILL.md to set up Tributary
              </span>
            </div>
          </li>
        </ol>
      </div>

      <div
        className="font-mono text-sm text-lando-muted/30 select-none py-8"
        aria-hidden="true"
      >
        //
      </div>

      <div className="mb-8 max-w-2xl space-y-3">
        <h2 className="text-xl font-semibold text-lando-accent font-mono">
          URL Pattern
        </h2>
        <p className="text-lando-muted">
          Subscription URLs follow this pattern
        </p>
      </div>

      <div className="border border-lando-border bg-lando-card p-6">
        <p className="text-lando-muted mb-4 text-sm">
          Subscription URLs are Base64-encoded:
        </p>
        <div className="bg-lando-bg/50 border border-lando-border p-4 font-mono text-sm text-lando-accent break-all">
          https://lando.tributary.so/subscribe/[base64_encoded_data]
        </div>
        <p className="text-lando-muted mt-6 mb-4 text-sm">
          Encoded data contains:
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            "tokenMint - Solana token mint address",
            "recipient - Payment recipient address",
            "gateway - Tributary gateway address",
            "amount - Payment amount",
            "autoRenew - Auto-renewal flag",
            "maxRenewals - Maximum renewals",
            "paymentFrequency - Payment frequency",
            "trackingId - Unique tracking ID",
          ].map((item) => (
            <div key={item} className="text-lando-muted text-sm font-mono">
              <span className="text-lando-accent">{item.split(" - ")[0]}</span>{" "}
              - {item.split(" - ")[1]}
            </div>
          ))}
        </div>
      </div>

      <div
        className="font-mono text-sm text-lando-muted/30 select-none py-8"
        aria-hidden="true"
      >
        //
      </div>

      <div className="border border-lando-border bg-muted/20 p-12 text-center">
        <h2 className="mb-4 text-2xl font-bold text-lando-accent font-mono">
          Ready to Build Agent Commerce?
        </h2>
        <p className="mb-8 text-lando-muted">
          Join the Tributary ecosystem and enable agent-to-agent subscriptions
          on Solana.
        </p>
        <a
          href="/skill.md"
          className="bg-lando-accent text-lando-bg font-bold px-8 py-4 hover:bg-lando-glow transition-all font-mono text-sm inline-block"
        >
          Get the Skill
        </a>
      </div>
    </section>
  );
}
