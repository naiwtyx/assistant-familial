"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "@/lib/get-error-message";

import { useMyMembership } from "./family-provider";
import { useFamilyMembers, useSetMemberPermission, useSetMemberRole } from "../hooks/use-family";
import { ROLE_LABELS, type FamilyRole } from "../lib/roles";

function initials(name: string | null | undefined): string {
  return name ? name.trim().slice(0, 2).toUpperCase() : "?";
}

/** Gestion des rôles et droits des membres (réservé aux parents). */
export function MemberManagement({ familyId }: { familyId: string }) {
  const { userId } = useMyMembership();
  const { data: members, isLoading } = useFamilyMembers(familyId);
  const setRole = useSetMemberRole(familyId);
  const setPermission = useSetMemberPermission(familyId);

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Membres &amp; droits</CardTitle>
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
                <li key={member.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
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
                        onClick={() =>
                          setRole.mutate({ userId: member.user_id, role: "member" }, { onError })
                        }
                      >
                        Rétrograder
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setRole.isPending}
                        onClick={() =>
                          setRole.mutate({ userId: member.user_id, role: "parent" }, { onError })
                        }
                      >
                        Nommer parent
                      </Button>
                    )}
                  </div>

                  {role === "member" ? (
                    <label className="text-muted-foreground flex items-center gap-2 pl-12 text-xs">
                      <Checkbox
                        checked={member.can_use_ai}
                        onCheckedChange={(checked) =>
                          setPermission.mutate(
                            { userId: member.user_id, canUseAi: checked === true },
                            { onError },
                          )
                        }
                        aria-label="Autoriser l'assistant IA"
                      />
                      <Sparkles className="size-3.5" />
                      Peut parler à l&apos;assistant IA
                    </label>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
