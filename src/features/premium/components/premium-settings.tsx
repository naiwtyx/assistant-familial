"use client";

import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyMembership } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { useIsAdmin, useIsPremium, useSetPremium, useSetPremiumByEmail } from "../hooks/use-premium";
import { FREE_FEATURES, PREMIUM_FEATURES } from "../lib/features";

/** Réglage « Assistant Budget » : statut + comparatif + gestion (admin). */
export function PremiumSettings() {
  const { family } = useMyMembership();
  const isPremium = useIsPremium();
  const isAdmin = useIsAdmin();
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
            isPremium ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {isPremium ? "Premium" : "Gratuit"}
        </span>
      </div>

      <p className="text-muted-foreground text-[13px] leading-relaxed">
        Votre assistant analyse vos dépenses et vous aide à mieux gérer votre budget. Le nécessaire
        est gratuit ; Premium ajoute l&apos;anticipation et les recommandations.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <FeatureColumn title="Gratuit" features={FREE_FEATURES} muted />
        <FeatureColumn title="Premium" features={PREMIUM_FEATURES} />
      </div>

      {/* Panneau admin — visible uniquement pour l'administrateur. */}
      {isAdmin ? <AdminPanel familyId={family.id} isPremium={isPremium} onToggle={toggle} pending={setPremium.isPending} /> : null}
    </div>
  );
}

function AdminPanel({
  isPremium,
  onToggle,
  pending,
}: {
  familyId: string;
  isPremium: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  const grant = useSetPremiumByEmail();
  const [email, setEmail] = useState("");

  function apply(premium: boolean) {
    const trimmed = email.trim();
    if (!trimmed) return;
    grant.mutate(
      { email: trimmed, premium },
      {
        onSuccess: (count) =>
          count > 0
            ? toast.success(premium ? `Premium accordé (${count} foyer)` : `Premium retiré (${count} foyer)`)
            : toast.error("Aucun foyer trouvé pour cet email."),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="border-border/60 flex flex-col gap-3 border-t pt-4">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
        <ShieldCheck className="size-3.5" strokeWidth={2} />
        Administration
      </p>

      {/* Ton propre foyer. */}
      <Button
        variant={isPremium ? "outline" : "default"}
        onClick={onToggle}
        disabled={pending}
        className="h-10 rounded-xl"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPremium ? "Désactiver pour mon foyer" : "Activer pour mon foyer"}
      </Button>

      {/* Accorder/retirer à un autre foyer par email. */}
      <div className="flex flex-col gap-2">
        <Input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email du testeur…"
          className="h-10 rounded-xl"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => apply(true)}
            disabled={grant.isPending || email.trim().length === 0}
            className="h-9 flex-1 rounded-xl"
          >
            {grant.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2} />}
            Donner
          </Button>
          <Button
            variant="outline"
            onClick={() => apply(false)}
            disabled={grant.isPending || email.trim().length === 0}
            className="h-9 flex-1 rounded-xl"
          >
            Retirer
          </Button>
        </div>
      </div>
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
