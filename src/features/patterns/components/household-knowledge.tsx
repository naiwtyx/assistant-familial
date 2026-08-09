"use client";

import { Brain, ShoppingCart, UtensilsCrossed, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useHouseholdPatterns } from "../hooks/use-patterns";
import { confidenceLabel } from "../lib/detect";
import type { HouseholdPattern } from "../services/patterns.service";

function storageKey(familyId: string): string {
  return `af:dismissed-patterns:${familyId}`;
}

function readDismissed(familyId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(familyId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const CATEGORY_ICON: Record<HouseholdPattern["category"], typeof ShoppingCart> = {
  shopping: ShoppingCart,
  meal: UtensilsCrossed,
  budget: Wallet,
};

/**
 * « Ce que l'assistant sait de votre foyer » (transparence § 9). Affiche les
 * habitudes détectées à partir de données RÉELLES, avec leur niveau de
 * confiance, et laisse l'utilisateur en ignorer (contrôle). Si rien n'a
 * encore assez de données, on affiche un message honnête plutôt que d'inventer.
 */
export function HouseholdKnowledge({ familyId }: { familyId: string }) {
  const { data: patterns, isLoading } = useHouseholdPatterns(familyId);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(readDismissed(familyId));
  }, [familyId]);

  function dismiss(key: string) {
    setDismissed((prev) => {
      const next = [...new Set([...prev, key])];
      try {
        window.localStorage.setItem(storageKey(familyId), JSON.stringify(next));
      } catch {
        // stockage indisponible : on ignore, l'état de session suffit.
      }
      return next;
    });
  }

  const visible = (patterns ?? []).filter((pattern) => !dismissed.includes(pattern.key));

  return (
    <div className="bg-card shadow-soft flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
          <Brain className="size-4" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[15px] font-medium">Ce que l&apos;assistant a appris</p>
          <p className="text-muted-foreground text-xs">Basé sur votre utilisation réelle</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Analyse…</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          L&apos;assistant apprend les habitudes de votre foyer au fil de l&apos;usage. Continuez à
          scanner vos tickets et à cuisiner vos repas — vos habitudes apparaîtront ici dès
          qu&apos;elles seront fiables.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((pattern) => {
            const Icon = CATEGORY_ICON[pattern.category];
            return (
              <li
                key={pattern.key}
                className="bg-muted/40 group/pattern flex items-start gap-2.5 rounded-xl p-3"
              >
                <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-snug">{pattern.text}</p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Confiance {confidenceLabel(pattern.confidence)} · {pattern.observations}{" "}
                    observation{pattern.observations > 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(pattern.key)}
                  aria-label="Ignorer cette habitude"
                  className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
