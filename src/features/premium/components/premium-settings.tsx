"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { useIsPremium, useSetPremium } from "../hooks/use-premium";
import { FREE_FEATURES, PREMIUM_FEATURES } from "../lib/features";

/** Réglage « Assistant Budget » : statut + comparatif + interrupteur (parents). */
export function PremiumSettings() {
  const { family, role } = useMyMembership();
  const isPremium = useIsPremium();
  const canManage = isAuthorized(role);
  const setPremium = useSetPremium(family.id);

  function toggle() {
    setPremium.mutate(!isPremium, {
      onSuccess: () =>
        toast.success(isPremium ? "Assistant Budget désactivé" : "Assistant Budget activé ✨"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="bg-card shadow-soft flex flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[15px] font-medium">Assistant Budget</p>
            <p className="text-muted-foreground text-xs">
              {isPremium ? "Activé pour votre foyer" : "Analyses avancées disponibles"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isPremium
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isPremium ? "Premium" : "Gratuit"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FeatureColumn title="Gratuit" features={FREE_FEATURES} muted />
        <FeatureColumn title="Assistant Budget" features={PREMIUM_FEATURES} />
      </div>

      {canManage ? (
        <Button
          variant={isPremium ? "outline" : "default"}
          onClick={toggle}
          disabled={setPremium.isPending}
          className="h-10 rounded-xl"
        >
          {setPremium.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPremium ? "Désactiver l'Assistant Budget" : "Activer l'Assistant Budget"}
        </Button>
      ) : null}
    </div>
  );
}

function FeatureColumn({
  title,
  features,
  muted = false,
}: {
  title: string;
  features: string[];
  muted?: boolean;
}) {
  return (
    <div className={cn("rounded-xl p-3", muted ? "bg-muted/40" : "bg-primary/5")}>
      <p
        className={cn(
          "mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase",
          muted ? "text-muted-foreground" : "text-primary",
        )}
      >
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[12.5px]">
            <Check
              className={cn("mt-0.5 size-3 shrink-0", muted ? "text-muted-foreground" : "text-primary")}
              strokeWidth={2.5}
            />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
