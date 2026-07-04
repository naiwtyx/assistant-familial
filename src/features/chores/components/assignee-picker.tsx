"use client";

import type { FamilyMemberWithProfile } from "@/features/family/services/family.service";
import { cn } from "@/lib/utils";

/** Sélection de plusieurs personnes assignées à une tâche (puces cliquables). */
export function AssigneePicker({
  members,
  selected,
  onToggle,
}: {
  members: FamilyMemberWithProfile[] | undefined;
  selected: string[];
  onToggle: (userId: string) => void;
}) {
  if (!members || members.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map((member) => {
        const active = selected.includes(member.user_id);
        return (
          <button
            key={member.user_id}
            type="button"
            onClick={() => onToggle(member.user_id)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted/50",
            )}
          >
            {member.profile?.display_name ?? "Membre"}
          </button>
        );
      })}
    </div>
  );
}
