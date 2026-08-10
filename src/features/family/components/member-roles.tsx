"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";

import { useMyMembership } from "./family-provider";
import { useFamilyMembers, useSetMemberRole } from "../hooks/use-family";
import { ROLE_LABELS, type FamilyRole } from "../lib/roles";

function initials(name: string | null | undefined): string {
  return name ? name.trim().slice(0, 2).toUpperCase() : "?";
}

/** Gestion des rôles des membres (nommer parent / rétrograder). Réservé aux parents. */
export function MemberRoles({ familyId }: { familyId: string }) {
  const { userId } = useMyMembership();
  const { data: members, isLoading, isError } = useFamilyMembers(familyId);
  const setRole = useSetMemberRole(familyId);

  const onError = (error: unknown) => toast.error(getErrorMessage(error));

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Impossible de charger les membres.</p>;

  return (
    <ul className="bg-card shadow-soft divide-border/60 divide-y rounded-2xl">
      {members?.map((member) => {
        const role = member.role as FamilyRole;
        const isSelf = member.user_id === userId;
        return (
          <li key={member.id} className="flex items-center gap-3 p-4">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
              {initials(member.profile?.display_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">
                {member.profile?.display_name ?? "Membre"}
                {isSelf ? " (toi)" : ""}
              </p>
              <p className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</p>
            </div>

            {role === "owner" ? (
              <span className="text-muted-foreground text-xs">—</span>
            ) : role === "parent" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={setRole.isPending}
                onClick={() => setRole.mutate({ userId: member.user_id, role: "member" }, { onError })}
              >
                Rétrograder
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={setRole.isPending}
                onClick={() => setRole.mutate({ userId: member.user_id, role: "parent" }, { onError })}
              >
                Nommer parent
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
