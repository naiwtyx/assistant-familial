"use client";

import {
  Bell,
  Brain,
  MessageSquarePlus,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsGroup, SettingsRow } from "@/components/shared/settings-nav";
import { useMyMembership } from "@/features/family/components/family-provider";
import { ROLE_LABELS, isAuthorized } from "@/features/family/lib/roles";

/**
 * Hub Réglages : une page courte et respirable, organisée en catégories de
 * lignes compactes. Chaque ligne ouvre une sous-page dédiée — plus aucune
 * grosse carte de configuration directement ici.
 */
export function SettingsView() {
  const { family, role, email, displayName } = useMyMembership();
  const roleLabel = ROLE_LABELS[role];

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <PageHeader title="Réglages" subtitle="Personnalise ton expérience" />

      <SettingsGroup title="Compte" className="motion-in">
        <SettingsRow
          href="/reglages/profil"
          icon={UserRound}
          title="Profil"
          description={`${displayName ?? email ?? "Compte"} · ${roleLabel}`}
        />
      </SettingsGroup>

      <SettingsGroup title="Préférences" className="motion-in-delay-1">
        <SettingsRow
          href="/reglages/apparence"
          icon={Paintbrush}
          title="Apparence"
          description="Clair, sombre ou automatique"
        />
        <SettingsRow
          href="/reglages/notifications"
          icon={Bell}
          title="Notifications"
          description="Rappels, événements et alertes"
        />
      </SettingsGroup>

      <SettingsGroup title="Assistant" className="motion-in-delay-2">
        <SettingsRow
          href="/reglages/assistant"
          icon={Sparkles}
          title="Assistant IA"
          description="Personnalisation et comportement"
        />
        <SettingsRow
          href="/reglages/apprentissage"
          icon={Brain}
          title="Ce que l'assistant a appris"
          description="Habitudes et préférences de ton foyer"
        />
        <SettingsRow
          href="/reglages/budget"
          icon={Wallet}
          title="Assistant Budget"
          description="Budget et fonctionnalités avancées"
        />
      </SettingsGroup>

      <SettingsGroup title="Famille" className="motion-in-delay-3">
        <SettingsRow
          href="/reglages/famille"
          icon={Users}
          title="Membres de la famille"
          description="Voir les membres et inviter"
        />
        {isAuthorized(role) ? (
          <SettingsRow
            href="/parents"
            icon={ShieldCheck}
            title="Espace parents"
            description="Administration et contrôle du foyer"
          />
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="Aide" className="motion-in-delay-3">
        <SettingsRow
          href="/reglages/aide"
          icon={MessageSquarePlus}
          title="Donner un avis · signaler un bug"
          description="L'app est en test — ton retour aide vraiment"
        />
      </SettingsGroup>

      <p className="text-muted-foreground flex items-center justify-center gap-1.5 pt-1 text-xs">
        <UserRound className="size-3" strokeWidth={2} />
        Connecté en tant que {roleLabel.toLowerCase()}
        {" · "}
        <Users className="size-3" strokeWidth={2} />
        {family.name}
      </p>
    </main>
  );
}
