import { Lock, Zap, Shield } from "lucide-react";
export default function HowRecurring() {
  return (
    <section id="how-it-works" className="py-16">
      <div className="mb-8 max-w-3xl space-y-3">
        <h2 className="text-xl font-semibold">
          Truely
          <span className="gradient-text">recurring</span>
          payments
        </h2>
        <p className="text-muted-foreground">
          Solana-native delegation to Tributary's smart contract. Users approve
          payment logic. Funds do not need to be locked in escrow. Sign Once.
          Pay Automatically. Verify Anywhere
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-medium">1. User Approves</h3>
          <p className="text-sm text-muted-foreground">
            Single transaction grants delegate permissions. Funds stay in
            wallet—no clunky locked-funds experience.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-medium">2. Protocol Executes</h3>
          <p className="text-sm text-muted-foreground">
            Permissionless contract processes payments automatically when due.
            Developers don't build custom rails from scratch.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <h3 className="font-medium">3. Funds Flow</h3>
          <p className="text-sm text-muted-foreground">
            Direct transfer to recipient, no escrow, full transparency.
            Businesses get a native recurring payment system.
          </p>
        </div>
      </div>
    </section>
  );
}
