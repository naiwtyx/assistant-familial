"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useMyMembership } from "@/features/family/components/family-provider";
import { FamilyMembersList } from "@/features/family/components/family-members-list";
import { InviteCard } from "@/features/family/components/invite-card";
import { ROLE_LABELS, isAuthorized } from "@/features/family/lib/roles";

import { NotificationSettings } from "./notification-settings";

export function SettingsView() {
  const { family, role, email } = useMyMembership();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-xl font-bold tracking-tight">Réglages</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apparence</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>

      {isAuthorized(role) ? (
        <Link
          href="/parents"
          className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-4 transition-colors"
        >
          <ShieldCheck className="text-primary size-5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Espace parents</p>
            <p className="text-muted-foreground text-xs">Gérer les rôles des membres</p>
          </div>
          <ChevronRight className="text-muted-foreground size-4" />
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compte</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm">{email}</p>
            <p className="text-muted-foreground text-xs">
              {ROLE_LABELS[role]} · {family.name}
            </p>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>

      <FamilyMembersList familyId={family.id} />
      <InviteCard familyId={family.id} />
    </main>
  );
}
