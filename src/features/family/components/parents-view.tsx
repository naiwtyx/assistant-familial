"use client";

import { Cake, Link2, Settings2, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SettingsGroup, SettingsRow, SubPageHeader } from "@/components/shared/settings-nav";

import { useMyMembership } from "./family-provider";
import { isAuthorized } from "../lib/roles";

/**
 * Hub d'administration du foyer (owner/parent). Vrai centre d'administration :
 * chaque domaine sensible a sa propre sous-page. L'accès est vérifié côté client
 * à partir du rôle ; les actions restent protégées côté base (RLS + RPC).
 */
export function ParentsView() {
  const { family, role } = useMyMembership();
  const router = useRouter();
  const allowed = isAuthorized(role);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <SubPageHeader
        backHref="/reglages"
        backLabel="Réglages"
        title="Espace parents"
        subtitle={`Administration du foyer · ${family.name}`}
      />

      {/* Bandeau d'information : on comprend immédiatement qu'on est dans la zone
          d'administration, différente des réglages normaux. */}
      <div className="motion-in bg-primary/5 border-primary/15 flex items-start gap-3 rounded-2xl border p-4">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
          <ShieldCheck className="size-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium">Accès réservé aux parents</p>
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-relaxed">
            Cette section permet de gérer les paramètres sensibles du foyer.
          </p>
        </div>
      </div>

      <SettingsGroup title="Famille" className="motion-in-delay-1">
        <SettingsRow
          href="/parents/membres"
          icon={Users}
          title="Membres & droits"
          description="Gérer les rôles des membres"
        />
      </SettingsGroup>

      <SettingsGroup title="Assistant IA" className="motion-in-delay-1">
        <SettingsRow
          href="/parents/ia"
          icon={Sparkles}
          title="Accès à l'IA"
          description="Contrôler l'accès des membres"
        />
        <SettingsRow
          href="/parents/age-ia"
          icon={Cake}
          title="Âge minimum pour l'IA"
          description="Limiter l'accès selon l'âge"
        />
      </SettingsGroup>

      <SettingsGroup title="Budget" className="motion-in-delay-2">
        <SettingsRow
          href="/parents/budget"
          icon={Wallet}
          title="Budget du foyer"
          description="Définir et suivre le plafond mensuel"
        />
      </SettingsGroup>

      <SettingsGroup title="Invitations" className="motion-in-delay-2">
        <SettingsRow
          href="/parents/invitations"
          icon={Link2}
          title="Invitations"
          description="Générer un code et approuver les demandes"
        />
      </SettingsGroup>

      <SettingsGroup title="Administration" className="motion-in-delay-3">
        <SettingsRow
          href="/parents/parametres"
          icon={Settings2}
          title="Paramètres du foyer"
          description="Rappel des courses et options du foyer"
        />
      </SettingsGroup>
    </main>
  );
}
