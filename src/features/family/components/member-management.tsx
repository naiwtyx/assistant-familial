"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";

import { useMyMembership } from "./family-provider";
import { useFamilyMembers, useSetMemberRole } from "../hooks/use-family";
import { ROLE_LABELS, type FamilyRole } from "../lib/roles";

function initials(name: string | null | undefined): string {
  return name ? name.trim().slice(0, 2).toUpperCase() : "?";
}

/** Gestion des rôles des membres (réservé aux parents). */
export function MemberManagement({ familyId }: { familyId: string }) {
  const { userId } = useMyMembership();
  const { data: members, isLoading } = useFamilyMembers(familyId);
  const setRole = useSetMemberRole(familyId);

  function change(targetUserId: string, role: Exclude<FamilyRole, "owner">) {
    setRole.mutate(
      { userId: targetUserId, role },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Membres &amp; rôles</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : (
          <ul className="divide-border divide-y">
            {members?.map((member) => {
              const role = member.role as FamilyRole;
              const isSelf = member.user_id === userId;
              return (
                <li key={member.id} className="flex items-center gap-3 py-2">
                  <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-sm font-medium">
                    {initials(member.profile?.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.profile?.display_name ?? "Membre"}
                      {isSelf ? " (toi)" : ""}
                    </p>
                    <p className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</p>
                  </div>

                  {role === "owner" ? null : role === "parent" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setRole.isPending}
                      onClick={() => change(member.user_id, "member")}
                    >
                      Rétrograder
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setRole.isPending}
                      onClick={() => change(member.user_id, "parent")}
                    >
                      Nommer parent
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
