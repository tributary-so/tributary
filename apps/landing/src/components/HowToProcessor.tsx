import { Terminal, ArrowRight } from "lucide-react";

const steps = [
  {
    num: "1",
    title: "Register Gateway",
    desc: "Set up your payment gateway with custom fees and signer keys. Become a payment processor on Solana.",
    accent: "primary",
    path: "M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z",
  },
  {
    num: "2",
    title: "Create Checkout",
    desc: "Generate payment links with our hosted checkout, or drop SDK components into your app. Either way, no Solana code.",
    accent: "primary",
    path: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  },
  {
    num: "3",
    title: "User Signs Once",
    desc: "User connects wallet, signs a single transaction. Token delegation handles all future payments automatically.",
    accent: "accent",
    path: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  },
  {
    num: "4",
    title: "Payments Execute",
    desc: "Recurring payments run automatically. Non-custodial, permissionless, on-chain. You verify via JWT. Done.",
    accent: "accent",
    path: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
  },
];

export default function HowToProcessor() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="text-foreground">How </span>
          <span className="gradient-text">It Works</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          From zero to production in four steps. Register, create, sign, done.
        </p>
      </div>
      <div className="relative">
        <div className="hidden md:block absolute top-8 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-px bg-gradient-to-r from-primary/10 via-primary/40 to-accent/40 pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map(({ num, title, desc, accent, path }) => (
            <div
              key={num}
              className="flex flex-col items-center text-center group"
            >
              <div
                className={`relative w-16 h-16 bg-card border ${
                  accent === "accent"
                    ? "border-accent/25 group-hover:border-accent/60 group-hover:bg-accent/10"
                    : "border-primary/25 group-hover:border-primary/60 group-hover:bg-primary/10"
                } flex items-center justify-center mb-5 z-10 transition-all duration-300`}
              >
                <svg
                  className={`w-7 h-7 ${
                    accent === "accent" ? "text-accent" : "text-primary"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={path}
                  />
                </svg>
                <span
                  className={`absolute -top-2 -right-2 w-5 h-5 ${
                    accent === "accent"
                      ? "bg-accent text-white"
                      : "bg-primary text-white"
                  } text-xs font-bold flex items-center justify-center`}
                >
                  {num}
                </span>
              </div>
              <h4 className="font-bold text-foreground mb-2 text-sm">
                {title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 border border-border bg-muted/10 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Terminal className="h-10 w-10 text-primary shrink-0" />
          <div className="flex-1 space-y-2">
            <h3 className="font-bold">Simple Integration</h3>
            <p className="text-sm text-muted-foreground">
              Drop pre-built React components into your app. Accept subscription
              payments immediately with just a few lines of code.
            </p>
          </div>
          <a
            href="https://docs.tributary.so/sdk-react"
            className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all shrink-0"
          >
            View SDK Docs <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
