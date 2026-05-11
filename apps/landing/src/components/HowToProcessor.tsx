const steps = [
  {
    num: "1",
    title: "User Signs Once",
    desc: "User connects wallet, signs a single transaction. Approves Token delegation and installs Policy for Payment.",
    accent: "accent",
    path: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  },
  {
    num: "2",
    title: "Businesses Validate",
    desc: "Businesses obtain real-time on-chain data to confirm payments and subscriptions.",
    accent: "accent2",
    path: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  },
  {
    num: "3",
    title: "Payments Execute",
    desc: "Recurring payments run automatically. Non-custodial, permissionless, on-chain.",
    accent: "accent",
    path: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  },
];

export default function HowToProcessor() {
  return (
    <div className="relative">
      <div className="hidden md:block absolute top-8 left-[calc(12.5%+2rem)] right-[calc(15.5%+2rem)] h-px bg-gradient-to-r from-primary/10 via-primary/40 to-accent/40 pointer-events-none" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map(({ num, title, desc, accent, path }) => (
          <div
            key={num}
            className="flex flex-col items-center text-center group"
          >
            <div
              className={`relative w-16 h-16 bg-card border ${
                accent === "accent"
                  ? "border-accent/25 group-hover:border-accent/60 group-hover:bg-secondary"
                  : "border-primary/25 group-hover:border-primary/60 group-hover:bg-secondary"
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
            <h4 className="font-bold text-foreground mb-2 text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
