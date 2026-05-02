import { ArrowRight, Check, Globe, Rocket } from "lucide-react";

const roadmap = [
  {
    phase: "Now",
    icon: Rocket,
    items: [
      "Expand live integrations",
      "Improve developer onboarding",
      "Make docs and SDK easier to implement",
    ],
  },
  {
    phase: "Next",
    icon: ArrowRight,
    items: [
      "Stronger commerce flows",
      "Better recurring billing UX",
      "More reusable payment templates for common product types",
    ],
  },
  {
    phase: "Ahead",
    icon: Globe,
    items: [
      "Deeper AI payment support",
      "More flexible payment logic",
      "Broader ecosystem integrations",
    ],
  },
];
export default function Roadmap() {
  {
    /* ─── Product Roadmap ─── */
  }
  <section id="roadmap" className="py-16">
    <div className="mb-8 max-w-3xl space-y-3">
      <h2 className="text-xl font-semibold">What's Next</h2>
      <p className="text-muted-foreground">
        Already live, with a clear, believable next layer of product growth.
      </p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {roadmap.map((phase) => (
        <div
          key={phase.phase}
          className="border border-border/50 hover:border-primary/30 transition-all"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <phase.icon className="h-5 w-5 text-primary" />
              <h3 className="font-bold">{phase.phase}</h3>
            </div>
            <ul className="space-y-2">
              {phase.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  </section>;
}
