"use client";

import { Bell, ChevronRight, Paintbrush, ShieldCheck, UserRound, Users } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useMyMembership } from "@/features/family/components/family-provider";
import { FamilyMembersList } from "@/features/family/components/family-members-list";
import { InviteCard } from "@/features/family/components/invite-card";
import { ROLE_LABELS, isAuthorized } from "@/features/family/lib/roles";

import { NotificationSettings } from "./notification-settings";

/** Petite carte "réglage" cohérente : icône colorée + titre + contenu à droite. */
function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { family, role, email, displayName } = useMyMembership();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <PageHeader title="Réglages" subtitle="Personnalise ton expérience" />

      {/* Compte : identité + déconnexion. C'est ici que vit le "profil". */}
      <Section title="Compte" className="motion-in">
        <div className="bg-card shadow-soft flex items-center gap-3 rounded-2xl p-4">
          <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {(displayName ?? email ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">
              {displayName ?? email ?? "Compte"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {ROLE_LABELS[role]} · {family.name}
            </p>
          </div>
          <SignOutButton />
        </div>
      </Section>

      {/* Apparence + notifications : les préférences classiques. */}
      <Section title="Préférences" className="motion-in-delay-1">
        <div className="bg-card shadow-soft divide-border/60 divide-y rounded-2xl">
          <SettingRow
            icon={Paintbrush}
            title="Apparence"
            description="Clair, sombre, ou automatique selon ton appareil"
          >
            <ThemeToggle />
          </SettingRow>
          <SettingRow
            icon={Bell}
            title="Notifications"
            description="Rappels, digest quotidien, événements du jour"
          >
            <NotificationSettings />
          </SettingRow>
        </div>
      </Section>

      {/* Famille : membres + invitations. Déplacé depuis le dashboard : ce n'est
          pas une info d'accueil quotidienne, c'est un réglage. */}
      <Section title="Famille" className="motion-in-delay-2">
        <div className="flex flex-col gap-3">
          <FamilyMembersList familyId={family.id} />
          <InviteCard familyId={family.id} />
        </div>
      </Section>

      {isAuthorized(role) ? (
        <Section title="Administration" className="motion-in-delay-3">
          <Link
            href="/parents"
            className="group bg-card shadow-soft flex items-center gap-3 rounded-2xl p-4 transition-all active:scale-[0.99]"
          >
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <ShieldCheck className="size-[18px]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Espace parents</p>
              <p className="text-muted-foreground text-xs">
                Rôles, accès IA, plafond de budget, invitations à approuver
              </p>
            </div>
            <ChevronRight className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Section>
      ) : null}

      {/* Footer discret : rappel identité, pour clore proprement la page. */}
      <p className="text-muted-foreground flex items-center justify-center gap-1.5 pt-2 text-xs">
        <UserRound className="size-3" strokeWidth={2} />
        Connecté en tant que {ROLE_LABELS[role].toLowerCase()}
        {" · "}
        <Users className="size-3" strokeWidth={2} />
        {family.name}
      </p>
    </main>
  );
}
