import type { ReactNode } from "react";
import { TextsReveal } from "./transitions";

/**
 * Numbered step wrapper with a staggered texts-reveal intro.
 * Mirrors the chainsquad grid-first look: uppercase label, tight tracking,
 * stone palette, sharp corners.
 */
export function StepShell({
  index,
  label,
  intro,
  children,
}: {
  index: number;
  label: string;
  intro: string[];
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border py-10 first:border-t-0 first:pt-0">
      <div className="grid md:grid-cols-12 gap-6 md:gap-10">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 text-muted-foreground text-xs uppercase tracking-[0.3em]">
            <span className="text-primary">
              {String(index).padStart(2, "0")}
            </span>
            <span>{label}</span>
          </div>
          <div className="mt-4 text-foreground/90 max-w-[40ch]">
            <TextsReveal lines={intro} />
          </div>
        </div>
        <div className="md:col-span-8">{children}</div>
      </div>
    </section>
  );
}
