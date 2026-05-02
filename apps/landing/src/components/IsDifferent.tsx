import { Check } from "lucide-react";

const differentiators = [
  "Live on mainnet since October 2025",
  "Recurring payments built as infrastructure, not a one-off feature",
  "Multiple payment models already supported",
  "Strong developer surface: app, docs, SDK, checkout",
  "Works across several use-case categories",
  "Built by a serious protocol founder with real shipping history",
];

export default function IsDifferent() {
  return (
    <section id="why-different" className="py-16">
      <div className="mb-8 max-w-3xl space-y-3">
        <h2 className="text-xl font-semibold">Why Tributary Is Different</h2>
        <p className="text-muted-foreground">
          Most teams don't want to build recurring payment logic themselves.
          Most users don't want awkward payment experiences.
        </p>
      </div>
      <div className="border border-border/50 bg-muted/10 p-8">
        <p className="text-sm font-medium mb-6">
          Tributary gives teams a reusable recurring payment layer built for
          Solana.
        </p>
        <ul className="space-y-3">
          {differentiators.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
