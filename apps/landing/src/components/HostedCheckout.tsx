import {
  ArrowRightLeft,
  ExternalLink,
  KeyRound,
  Lock,
  Wallet,
} from "lucide-react";

export function HostedCheckout() {
  {
    /* ─── 8. JWT Checkout Experience ─── */
  }
  <section id="checkout" className="py-16">
    <div className="mb-8 max-w-3xl space-y-3">
      <h2 className="text-xl font-semibold">
        Accept Crypto as Easily as Checking a Cookie
      </h2>
      <p className="text-muted-foreground">
        No Solana SDK. No RPC calls. No account deserialization. Just a JWT
        check—the same thing you've done with session cookies and auth tokens.
      </p>
    </div>

    <div className="border border-border/50 bg-muted/10 p-6 mb-6">
      <div className="grid gap-0 md:grid-cols-4">
        <div className="flex flex-col items-center text-center p-5 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-primary/40 bg-primary/10 text-primary font-bold text-sm">
            1
          </div>
          <h3 className="font-medium text-sm">Derive Checkout Link</h3>
          <p className="text-xs text-muted-foreground">
            Your server builds a checkout URL from invoice data (amount,
            recipient, plan details).
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-5 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-primary/40 bg-primary/10 text-primary font-bold text-sm">
            2
          </div>
          <h3 className="font-medium text-sm">Redirect User</h3>
          <p className="text-xs text-muted-foreground">
            URL contains base64-encoded checkout payload. User lands on
            checkout.tributary.so.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-5 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-accent/40 bg-accent/10 text-accent font-bold text-sm">
            3
          </div>
          <h3 className="font-medium text-sm">Customer Pays</h3>
          <p className="text-xs text-muted-foreground">
            Wallet connect, sign, and pay. Tributary handles the full Solana
            transaction flow.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-5 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center border border-accent/40 bg-accent/10 text-accent font-bold text-sm">
            4
          </div>
          <h3 className="font-medium text-sm">JWT Confirmation</h3>
          <p className="text-xs text-muted-foreground">
            On-chain payment confirmed. User redirected to your successPage with
            a signed JWT proving payment and subscription setup.
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <div className="border border-border/50 p-5 space-y-3">
        <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-medium">Hosted Checkout</h3>
        <p className="text-sm text-muted-foreground">
          Wallet connection, signing, and execution all handled on
          checkout.tributary.so. No Solana code on your end.
        </p>
      </div>
      <div className="border border-border/50 p-5 space-y-3">
        <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
          <KeyRound className="h-5 w-5 text-accent" />
        </div>
        <h3 className="font-medium">JWT Proof</h3>
        <p className="text-sm text-muted-foreground">
          Verify the JWT with any standard library. Subscription status, payment
          amounts—cryptographically signed, on-chain verifiable.
        </p>
      </div>
      <div className="border border-border/50 p-5 space-y-3">
        <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-medium">Self-Hostable</h3>
        <p className="text-sm text-muted-foreground">
          Checkout, API, indexer, signing keys—all open source and
          self-hostable. Start hosted, migrate when ready.
        </p>
      </div>
    </div>

    <div className="mt-6 flex flex-col sm:flex-row gap-3">
      <a
        href="https://checkout.tributary.so"
        target="_blank"
        rel="noopener noreferrer"
        className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all"
      >
        <Wallet className="h-4 w-4" />
        Try Checkout
        <ExternalLink className="h-3 w-3" />
      </a>
      <a
        href="https://docs.tributary.so/jwt-auth/"
        target="_blank"
        rel="noopener noreferrer"
        className="border border-border/50 bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all text-muted-foreground hover:text-foreground"
      >
        Read JWT Flow Docs
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  </section>;
}
