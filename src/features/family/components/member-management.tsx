"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";

import { useActiveFamily, useMyMembership } from "./family-provider";
import {
  useFamilyMembers,
  useSetFamilyAiMinAge,
  useSetMemberBirthDate,
  useSetMemberPermission,
  useSetMemberRole,
} from "../hooks/use-family";
import { computeAge } from "../lib/ai-access";
import { ROLE_LABELS, type FamilyRole } from "../lib/roles";

function initials(name: string | null | undefined): string {
  return name ? name.trim().slice(0, 2).toUpperCase() : "?";
}

const TODAY = new Date().toISOString().slice(0, 10);

/** Gestion des rôles et droits des membres (réservé aux parents). */
export function MemberManagement({ familyId }: { familyId: string }) {
  const { userId } = useMyMembership();
  const family = useActiveFamily();
  const { data: members, isLoading } = useFamilyMembers(familyId);
  const setRole = useSetMemberRole(familyId);
  const setPermission = useSetMemberPermission(familyId);
  const setBirthDate = useSetMemberBirthDate(familyId);
  const setMinAge = useSetFamilyAiMinAge(familyId);

  const [minAgeInput, setMinAgeInput] = useState(family.ai_min_age?.toString() ?? "");

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function saveMinAge() {
    const trimmed = minAgeInput.trim();
    const parsed = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 99)) {
      toast.error("Âge invalide");
      setMinAgeInput(family.ai_min_age?.toString() ?? "");
      return;
    }
    if (parsed === (family.ai_min_age ?? null)) return;
    setMinAge.mutate(parsed, {
      onSuccess: () =>
        toast.success(parsed == null ? "Limite d'âge retirée" : `Âge minimum IA : ${parsed} ans`),
      onError,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Membres &amp; droits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 mb-4 rounded-lg border p-3">
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Sparkles className="text-primary size-4" />
              Âge minimum pour l&apos;IA
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={minAgeInput}
              onChange={(event) => setMinAgeInput(event.target.value)}
              onBlur={saveMinAge}
              placeholder="—"
              aria-label="Âge minimum pour l'assistant IA"
              className="h-9 w-16 text-center"
            />
          </label>
          <p className="text-muted-foreground mt-1.5 text-xs">
            Laisse vide pour aucune limite. Un enfant sans date de naissance renseignée est bloqué
            si une limite est définie.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : (
          <ul className="divide-border divide-y">
            {members?.map((member) => {
              const role = member.role as FamilyRole;
              const isSelf = member.user_id === userId;
              const age = computeAge(member.birth_date);
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
                    <div className="flex flex-col gap-2 pl-12">
                      <label className="text-muted-foreground flex items-center gap-2 text-xs">
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

                      <label className="text-muted-foreground flex items-center gap-2 text-xs">
                        <span className="shrink-0">Naissance</span>
                        <Input
                          type="date"
                          max={TODAY}
                          value={member.birth_date ?? ""}
                          onChange={(event) =>
                            setBirthDate.mutate(
                              { userId: member.user_id, birthDate: event.target.value || null },
                              { onError },
                            )
                          }
                          aria-label="Date de naissance"
                          className="h-9 w-40"
                        />
                        {age != null ? (
                          <span className="shrink-0 tabular-nums">{age} ans</span>
                        ) : null}
                      </label>
                    </div>
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
