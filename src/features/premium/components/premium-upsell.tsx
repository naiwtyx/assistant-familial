"use client";

import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PREMIUM_FEATURES } from "../lib/features";

/**
 * Carte d'upsell « Assistant Budget » affichée à la place des analyses
 * avancées quand le foyer n'est pas Premium. Vend la valeur, pas une limite.
 */
export function PremiumUpsell({
  onActivate,
  pending = false,
  canActivate = false,
}: {
  onActivate?: () => void;
  pending?: boolean;
  canActivate?: boolean;
}) {
  return (
    <div className="bg-ai-gradient shadow-ai flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-4" strokeWidth={2} />
        <span className="text-primary text-[11px] font-semibold tracking-[0.08em] uppercase">
          Assistant Budget
        </span>
      </div>
      <p className="text-[13.5px] leading-relaxed">
        Passez à l&apos;Assistant Budget pour comprendre, anticiper et optimiser vos dépenses.
      </p>
      <ul className="flex flex-col gap-1.5">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[13px]">
            <Check className="text-primary mt-0.5 size-3.5 shrink-0" strokeWidth={2.5} />
            {feature}
          </li>
        ))}
      </ul>
      {canActivate ? (
        <Button
          onClick={onActivate}
          disabled={pending}
          className="mt-1 h-10 rounded-xl transition-transform active:scale-[0.98]"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" strokeWidth={2} />}
          Activer l&apos;Assistant Budget
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          Contactez-nous pour activer l&apos;Assistant Budget pour votre foyer.
        </p>
      )}
    </div>
  );
}
