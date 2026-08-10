"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";

import { useFamilyMembers, useSetMemberBirthDate, useSetMemberPermission } from "../hooks/use-family";
import { computeAge } from "../lib/ai-access";
import { ROLE_LABELS, type FamilyRole } from "../lib/roles";

function initials(name: string | null | undefined): string {
  return name ? name.trim().slice(0, 2).toUpperCase() : "?";
}

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Contrôle l'accès des membres à l'assistant IA : autorisation par membre +
 * date de naissance (utilisée par la limite d'âge). Réservé aux parents.
 * Parents/propriétaires ont toujours accès — seuls les membres sont réglables.
 */
export function AiMemberAccess({ familyId }: { familyId: string }) {
  const { data: members, isLoading, isError } = useFamilyMembers(familyId);
  const setPermission = useSetMemberPermission(familyId);
  const setBirthDate = useSetMemberBirthDate(familyId);

  const onError = (error: unknown) => toast.error(getErrorMessage(error));

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  if (isError)
    return <p className="text-destructive text-sm">Impossible de charger les membres.</p>;

  const regularMembers = (members ?? []).filter((m) => (m.role as FamilyRole) === "member");

  return (
    <div className="flex flex-col gap-3">
      <ul className="bg-card shadow-soft divide-border/60 divide-y rounded-2xl">
        {members?.map((member) => {
          const role = member.role as FamilyRole;
          const isRegular = role === "member";
          return (
            <li key={member.id} className="flex items-center gap-3 p-4">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {initials(member.profile?.display_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">
                  {member.profile?.display_name ?? "Membre"}
                </p>
                <p className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</p>
              </div>
              {isRegular ? (
                <Checkbox
                  checked={member.can_use_ai}
                  onCheckedChange={(checked) =>
                    setPermission.mutate(
                      { userId: member.user_id, canUseAi: checked === true },
                      { onError },
                    )
                  }
                  aria-label={`Autoriser ${member.profile?.display_name ?? "ce membre"} à utiliser l'IA`}
                  className="size-5"
                />
              ) : (
                <span className="text-primary flex items-center gap-1 text-xs font-medium">
                  <Sparkles className="size-3.5" strokeWidth={2} />
                  Toujours
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Dates de naissance des membres — servent à appliquer la limite d'âge IA. */}
      {regularMembers.length > 0 ? (
        <div className="bg-card shadow-soft flex flex-col gap-3 rounded-2xl p-4">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
            Dates de naissance
          </p>
          {regularMembers.map((member) => {
            const age = computeAge(member.birth_date);
            return (
              <label key={member.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {member.profile?.display_name ?? "Membre"}
                </span>
                {age != null ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {age} ans
                  </span>
                ) : null}
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
                  aria-label={`Date de naissance de ${member.profile?.display_name ?? "ce membre"}`}
                  className="h-9 w-40 shrink-0"
                />
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
