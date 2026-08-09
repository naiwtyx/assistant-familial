"use client";

import { Calculator, Check, TriangleAlert } from "lucide-react";

import { useActiveFamily } from "@/features/family/components/family-provider";
import { useIsPremium } from "@/features/premium/hooks/use-premium";
import { cn } from "@/lib/utils";

import { useShoppingEstimateContext } from "../hooks/use-budget";
import { estimateList } from "../lib/estimate";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Estime le coût de la liste de courses à partir de l'historique de prix, et
 * le compare au budget restant (Phase 9). Ne s'affiche que si l'on a assez de
 * données pour être crédible (§ 26) — et seulement pour les parents (RLS sur
 * les tickets). Sinon : rien.
 */
export function ListEstimateCard({ familyId, itemNames }: { familyId: string; itemNames: string[] }) {
  const family = useActiveFamily();
  const isPremium = useIsPremium();
  const { data } = useShoppingEstimateContext(familyId);

  // Estimation de liste = Assistant Budget (Premium).
  if (!isPremium) return null;
  if (!data || data.priceSampleSize < 5 || itemNames.length === 0) return null;

  const estimate = estimateList(itemNames, data.priceByName);
  if (estimate.matched < 3) return null; // trop peu d'articles chiffrables

  const hasBudget = family.monthly_budget != null && family.monthly_budget > 0;
  const remaining = hasBudget ? family.monthly_budget! - data.spentThisMonth : null;
  const over = remaining != null && estimate.total > remaining;

  return (
    <div className="motion-in-delay-1 bg-card shadow-soft flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-xl">
            <Calculator className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[13px] font-medium">Estimation de la liste</p>
            <p className="text-muted-foreground text-[11px]">
              {estimate.matched} article{estimate.matched > 1 ? "s" : ""} estimé
              {estimate.matched > 1 ? "s" : ""}
              {estimate.unmatched > 0 ? ` · ${estimate.unmatched} non chiffré${estimate.unmatched > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <p className="font-heading text-lg font-semibold tabular-nums">
          ~{euro.format(estimate.total)}
        </p>
      </div>

      {remaining != null ? (
        <div className="border-border/50 flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground text-[12px]">
            Budget restant · {euro.format(Math.max(0, remaining))}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              over
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {over ? (
              <>
                <TriangleAlert className="size-3" strokeWidth={2} />
                Dépasse d&apos;environ {euro.format(estimate.total - remaining)}
              </>
            ) : (
              <>
                <Check className="size-3" strokeWidth={2.5} />
                Dans le budget
              </>
            )}
          </span>
        </div>
      ) : null}

      {/* Recommandation basée sur l'habitude (pattern panier moyen). */}
      {data.averageBasket != null && estimate.total > data.averageBasket * 1.15 ? (
        <p className="text-muted-foreground text-[12px]">
          C&apos;est au-dessus de votre panier habituel (~{euro.format(data.averageBasket)}).
        </p>
      ) : null}

      <p className="text-muted-foreground text-[10.5px]">
        Estimation basée sur tes tickets — les prix réels peuvent varier.
      </p>
    </div>
  );
}
