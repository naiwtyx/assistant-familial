"use client";

import { Brain, Check, ShieldCheck, Sparkles } from "lucide-react";

import { SettingsRow, SubPageHeader } from "@/components/shared/settings-nav";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";

/**
 * Page « Assistant IA » (préférences côté utilisateur). N'invente aucun réglage :
 * expose l'état d'accès réel + des raccourcis vers la personnalisation et, pour
 * les parents, vers les contrôles d'accès (Espace parents).
 */
export function AssistantPrefsView() {
  const { canUseAi, role } = useMyMembership();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <SubPageHeader
        backHref="/reglages"
        backLabel="Réglages"
        title="Assistant IA"
        subtitle="Personnalise la façon dont ton assistant t'aide"
      />

      {/* État d'accès réel de l'utilisateur courant. */}
      <div className="motion-in bg-card shadow-soft flex items-center gap-3 rounded-2xl p-4">
        <div
          className={
            canUseAi
              ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl"
          }
        >
          {canUseAi ? (
            <Check className="size-[18px]" strokeWidth={2.5} />
          ) : (
            <Sparkles className="size-[18px]" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">
            {canUseAi ? "Assistant activé" : "Assistant désactivé"}
          </p>
          <p className="text-muted-foreground text-xs">
            {canUseAi
              ? "Tu peux discuter avec l'assistant et lui confier des actions."
              : "Un parent a désactivé ton accès à l'assistant."}
          </p>
        </div>
      </div>

      <div className="motion-in-delay-1 flex flex-col gap-2">
        <p className="text-muted-foreground px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
          Personnalisation
        </p>
        <div className="bg-card shadow-soft divide-border/60 divide-y overflow-hidden rounded-2xl">
          <SettingsRow
            href="/reglages/apprentissage"
            icon={Brain}
            title="Ce que l'assistant a appris"
            description="Les habitudes détectées de ton foyer"
          />
          {isAuthorized(role) ? (
            <SettingsRow
              href="/parents/ia"
              icon={ShieldCheck}
              title="Contrôler l'accès des membres"
              description="Autoriser l'IA et fixer un âge minimum (parents)"
            />
          ) : null}
        </div>
      </div>

      <p className="text-muted-foreground px-1 text-xs leading-relaxed">
        L&apos;assistant s&apos;appuie sur les données réelles de ton foyer (courses, inventaire,
        repas, budget) pour proposer des actions que tu confirmes toujours toi-même.
      </p>
    </main>
  );
}
