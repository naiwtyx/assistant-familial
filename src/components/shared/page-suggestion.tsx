import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Suggestion IA discrète en tête de page. Calculée client-side depuis les
 * données déjà chargées (pas d'appel réseau) — le texte reste utile même hors
 * ligne et disparaît proprement quand il n'y a rien de pertinent à dire.
 * Rend `null` si `text` est vide, pour que l'appelant puisse toujours poser
 * le composant sans conditionner sa hiérarchie.
 */
export function PageSuggestion({
  text,
  action,
  className,
}: {
  text?: string | null;
  action?: ReactNode;
  className?: string;
}) {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  return (
    <div
      className={cn(
        "motion-in-delay-1 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 dark:border-primary/25 dark:bg-primary/8",
        className,
      )}
    >
      <div className="text-primary bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
        <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-primary/70 dark:text-primary/80">
          Suggestion
        </p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-balance">{trimmed}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
