import { ArrowRight, Play } from "lucide-react";

export function Landing() {
  return (
    <>
      <section className="py-20">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="flex flex-col items-start gap-4 text-left">
            <div className="inline-block mb-2">
              <span className="text-matrix-green font-mono text-sm px-4 py-2 border ">
                &gt; Stripe for AI agents
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-snug tracking-tighter font-mono">
              <span className="">LANDO</span>
              <br />
              <span className="">Agent Commerce on Solana</span>
            </h1>
            <p className="text-xl ">
              <span className="">Service agents</span> generate subscription
              URLs. <span className="">Customer agents</span> pay via Tributary.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href="/skill.md"
                className="bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 h-11 px-6"
              >
                <ArrowRight className="h-4 w-4" />
                Get the Skill
              </a>
              <a
                href="/#/subscribe/eyJtIjoic3Vic2NyaXB0aW9uIiwidG0iOiJFUGpGV2RkNUF1ZnFTU3FlTTJxTjF4enliYXBDOEc0d0VHR2tad3lURHQxdiIsInIiOiJIaHExVDhBSGo0UEg0ZmJVVnRrcVZIRjhNeUY3eHZCU2JBODd2TFV5ZFNUbiIsImEiOiIxMCIsInRpZCI6InRyaWJfMTc3MzI5ODY4NDU3OF9hdWw1MTRiOHAiLCJzdSI6Im51bGwiLCJjdSI6Im51bGwiLCJnIjoiNm50bTVyV3FERmVmRVQ4UkZ5WlY3M0ZjZHF4UE1iYzdUc28zcENNV2s0dzQiLCJhciI6dHJ1ZSwibXIiOiIxMiIsInBmIjoid2Vla2x5Iiwic3QiOiJudWxsIiwibGkiOiJbXSJ9"
                className="border bg-background shadow-2xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 h-11 px-6"
              >
                <Play className="h-4 w-4" />
                Try Demo
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <div className="font-mono text-sm  uppercase tracking-[0.12em]">
                Network
              </div>
              <div className="text-2xl font-bold flex items-center gap-2 ">
                <img
                  src="/solana-logomark.svg"
                  className="h-5 w-5"
                  alt="Solana"
                />
                Solana
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-sm  uppercase tracking-[0.12em]">
                Type
              </div>
              <div className="text-2xl font-bold ">Agent Commerce</div>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-sm  uppercase tracking-[0.12em]">
                Integration
              </div>
              <div className="text-2xl font-bold ">Tributary SDK</div>
            </div>
          </div>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      <section className="py-20">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold  font-mono">The Flow</h2>
          <p className="">How agents interact with Lando</p>
        </div>

        <div className="border   p-8 space-y-4">
          <ol className="space-y-4">
            <li className="flex items-start">
              <div className="shrink-0 w-10 h-10 /20 flex items-center justify-center mr-4 font-mono  font-bold">
                1
              </div>
              <div>
                <span className=" font-semibold">
                  Service agent generates subscription URL
                </span>
                <p className="text-sm mt-1 ">Using the Lando skill</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="shrink-0 w-10 h-10 /20 flex items-center justify-center mr-4 font-mono  font-bold">
                2
              </div>
              <div>
                <span className=" font-semibold">
                  Customer agent receives URL and visits page
                </span>
              </div>
            </li>
            <li className="flex items-start">
              <div className="shrink-0 w-10 h-10 /20 flex items-center justify-center mr-4 font-mono  font-bold">
                3
              </div>
              <div>
                <span className=" font-semibold">
                  Lando decodes URL and displays custom SKILL.md
                </span>
              </div>
            </li>
            <li className="flex items-start">
              <div className="shrink-0 w-10 h-10 /20 flex items-center justify-center mr-4 font-mono  font-bold">
                4
              </div>
              <div>
                <span className=" font-semibold">
                  Customer agent follows SKILL.md to set up Tributary
                </span>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      <section className="py-20">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold  font-mono">URL Pattern</h2>
          <p className="">Subscription URLs follow this pattern</p>
        </div>

        <div className="border   p-6">
          <p className=" mb-4 text-sm">Subscription URLs are Base64-encoded:</p>
          <div className="/50 border  p-4 font-mono text-sm  break-all">
            https://lando.tributary.so/subscribe/[base64_encoded_data]
          </div>
          <p className=" mt-6 mb-4 text-sm">Encoded data contains:</p>
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
              <div key={item} className=" text-sm font-mono">
                <span className="">{item.split(" - ")[0]}</span> -{" "}
                {item.split(" - ")[1]}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      <section className="py-20">
        <div className="border  bg-muted/20 p-12 text-center">
          <h2 className="mb-4 text-2xl font-bold  font-mono">
            Ready to Build Agent Commerce?
          </h2>
          <p className="mb-8 ">
            Join the Tributary ecosystem and enable agent-to-agent subscriptions
            on Solana.
          </p>
          <a
            href="/skill.md"
            className="  font-bold px-8 py-4  transition-all font-mono text-sm inline-block"
          >
            Get the Skill
          </a>
        </div>
      </section>
    </>
  );
}
