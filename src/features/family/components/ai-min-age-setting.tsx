"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";

import { useActiveFamily } from "./family-provider";
import { useSetFamilyAiMinAge } from "../hooks/use-family";

/**
 * Âge minimum pour accéder à l'assistant IA (réglage familial, réservé aux
 * parents). Sélecteur pas-à-pas. Vide = aucune limite. Conserve exactement la
 * logique de sécurité existante (RPC set_family_ai_min_age).
 */
export function AiMinAgeSetting({ familyId }: { familyId: string }) {
  const family = useActiveFamily();
  const setMinAge = useSetFamilyAiMinAge(familyId);
  const [value, setValue] = useState<number | null>(family.ai_min_age ?? null);

  function save(next: number | null) {
    if (next != null && (next < 0 || next > 99)) return;
    setValue(next);
    setMinAge.mutate(next, {
      onSuccess: () =>
        toast.success(next == null ? "Limite d'âge retirée" : `Âge minimum IA : ${next} ans`),
      onError: (error) => {
        setValue(family.ai_min_age ?? null);
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <div className="bg-card shadow-soft flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-medium">Âge minimum</span>
        <div className="bg-muted/60 flex items-center rounded-full p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-lg"
            onClick={() => save(value == null ? 13 : Math.max(0, value - 1))}
            disabled={setMinAge.isPending}
            aria-label="Diminuer l'âge minimum"
          >
            −
          </Button>
          <span className="min-w-16 text-center text-sm font-medium tabular-nums">
            {value == null ? "Aucune" : `${value} ans`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-lg"
            onClick={() => save(value == null ? 13 : Math.min(99, value + 1))}
            disabled={setMinAge.isPending}
            aria-label="Augmenter l'âge minimum"
          >
            +
          </Button>
        </div>
      </div>

      {value != null ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => save(null)}>
          Retirer la limite
        </Button>
      ) : null}

      <p className="text-muted-foreground text-[13px] leading-relaxed">
        Les membres dont l&apos;âge est inférieur à cette limite ne pourront pas utiliser
        l&apos;assistant. Si aucune limite n&apos;est définie, aucun âge minimum n&apos;est appliqué.
        Un membre sans date de naissance renseignée est bloqué dès qu&apos;une limite existe.
      </p>
    </div>
  );
}
