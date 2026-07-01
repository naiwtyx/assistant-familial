"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useFamilyMembers } from "../hooks/use-family";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim().slice(0, 2).toUpperCase();
}

export function FamilyMembersList({ familyId }: { familyId: string }) {
  const { data: members, isLoading, isError } = useFamilyMembers(familyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Membres{members ? ` (${members.length})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : isError ? (
          <p className="text-destructive text-sm">Impossible de charger les membres.</p>
        ) : (
          <ul className="divide-border divide-y">
            {members?.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-sm font-medium">
                  {initials(member.profile?.display_name)}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {member.profile?.display_name ?? "Membre"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {member.role === "owner" ? "Propriétaire" : "Membre"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
