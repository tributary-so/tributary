import { Link } from "react-router-dom";
import { Navbar } from "@tributary-so/ui";

export function AppHeader() {
  return (
    <Navbar
      brand={
        <Link className="inline-flex items-center gap-3" to="/">
          <div className="w-10 h-10 border flex items-center justify-center">
            <span className="font-bold text-xl font-mono text-primary">L</span>
          </div>
          <div>
            <span className="text-xl font-mono font-bold">LANDO</span>
            <p className="text-xs text-muted-foreground">Agent Commerce on Solana</p>
          </div>
        </Link>
      }
      items={[
        { label: "Checkout", href: "https://checkout.tributary.so", external: true },
        { label: "Docs", href: "https://docs.tributary.so", external: true },
        { label: "Main App", href: "https://tributary.so", external: true },
      ]}
    />
  );
}
