"use client";

import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { useActiveFamily } from "@/features/family/components/family-provider";

import { HouseholdKnowledge } from "./household-knowledge";

/**
 * Page dédiée « Ce que l'assistant a appris » (accessible depuis Réglages >
 * Assistant > Personnalisation). Sortie des réglages pour ne pas être noyée,
 * et donner l'impression que l'app apprend réellement à connaître le foyer.
 */
export function HouseholdKnowledgePage() {
  const family = useActiveFamily();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Ce que l'assistant a appris" subtitle="Basé sur votre utilisation réelle" />

      <div className="bg-ai-gradient shadow-ai flex items-start gap-3 rounded-2xl p-4">
        <Sparkles className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={2} />
        <p className="text-[13px] leading-relaxed">
          L&apos;assistant observe vos habitudes réelles — jours de courses, panier moyen, repas
          fréquents — pour personnaliser ses suggestions. Rien n&apos;apparaît tant qu&apos;une
          habitude n&apos;est pas fiable, et vous pouvez retirer ce qui ne vous convient pas.
        </p>
      </div>

      <HouseholdKnowledge familyId={family.id} />
    </main>
  );
}
