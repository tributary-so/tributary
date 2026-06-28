import { Link } from "react-router-dom";
import { CreditCard, MousePointerClick } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20 flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold mb-2">Tributary Examples</h1>
        <p className="text-muted-foreground mb-12 text-sm max-w-md">
          Explore integration patterns for accepting USDC payments on Solana.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link
            to="/checkout"
            className="group flex flex-col items-center gap-4 border border-border p-8 hover:border-primary hover:bg-muted/50 transition-colors"
          >
            <CreditCard className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Checkout Demo</h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Generate a hosted checkout link using{" "}
                <code className="bg-muted px-1 py-0.5">payments API</code>. No
                wallet connection required.
              </p>
            </div>
          </Link>

          <Link
            to="/buttons"
            className="group flex flex-col items-center gap-4 border border-border p-8 hover:border-primary hover:bg-muted/50 transition-colors"
          >
            <MousePointerClick className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <h2 className="text-lg font-semibold mb-1">React Buttons</h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Drop-in payment &amp; subscription buttons using{" "}
                <code className="bg-muted px-1 py-0.5">sdk-react</code>.
                Requires wallet connection.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
