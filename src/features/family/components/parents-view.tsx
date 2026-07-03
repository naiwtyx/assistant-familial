"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BudgetDashboard } from "@/features/budget/components/budget-dashboard";

import { useMyMembership } from "./family-provider";
import { MemberManagement } from "./member-management";
import { PendingInvitesCard } from "./pending-invites-card";
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
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <ShieldCheck className="text-primary size-5" />
          Espace parents
        </h1>
        <p className="text-muted-foreground text-sm">Réservé aux parents · {family.name}</p>
      </header>

      <div className="bg-muted/40 text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
        🔒 Cette page n&apos;est visible que par les parents. Gère ici qui peut administrer la
        famille.
      </div>

      <PendingInvitesCard familyId={family.id} />
      <BudgetDashboard familyId={family.id} />
      <MemberManagement familyId={family.id} />
    </main>
  );
}
