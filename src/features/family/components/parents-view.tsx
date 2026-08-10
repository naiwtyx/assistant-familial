"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BudgetDashboard } from "@/features/budget/components/budget-dashboard";

import { useMyMembership } from "./family-provider";
import { MemberManagement } from "./member-management";
import { PendingInvitesCard } from "./pending-invites-card";
import { ShoppingReminderCard } from "./shopping-reminder-card";
import { isAuthorized } from "../lib/roles";

/**
 * Tableau de bord réservé aux parents (owner/parent). L'accès est vérifié côté
 * client à partir du rôle déjà chargé (rapide) ; les actions sensibles restent
 * protégées côté base (RLS + fonction `set_member_role`).
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
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <Link
        href="/reglages"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Réglages
      </Link>

      <header>
        <h1 className="font-heading flex items-center gap-2 text-xl font-semibold tracking-tight">
          <ShieldCheck className="text-primary size-5" strokeWidth={1.75} />
          Espace parents
        </h1>
        <p className="text-muted-foreground text-sm">{family.name}</p>
      </header>

      {/* Bannière distincte (accent, pas le style « carte » habituelle) pour que
          l'utilisateur comprenne immédiatement que cette zone diffère des
          réglages normaux (§ 8). */}
      <div className="bg-primary/5 border-primary/15 flex items-start gap-3 rounded-2xl border p-4">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
          <ShieldCheck className="size-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium">Espace réservé aux parents</p>
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-relaxed">
            Les paramètres de gestion de la famille sont regroupés ici : budget, rôles, accès à
            l&apos;assistant et invitations.
          </p>
        </div>
      </div>

      <PendingInvitesCard familyId={family.id} />
      <BudgetDashboard familyId={family.id} />
      <MemberManagement familyId={family.id} />
      <ShoppingReminderCard familyId={family.id} />
    </main>
  );
}
