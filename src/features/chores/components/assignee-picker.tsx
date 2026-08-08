"use client";

import { Check } from "lucide-react";

import type { FamilyMemberWithProfile } from "@/features/family/services/family.service";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim().slice(0, 2).toUpperCase();
}

function firstName(name: string | null | undefined): string {
  if (!name) return "Membre";
  return name.trim().split(/\s+/)[0] ?? "Membre";
}

/**
 * Sélection multiple des membres assignés à une tâche.
 * Passe des puces plates à des avatars ronds façon iOS : plus premium,
 * plus rapide à parcourir (le regard identifie l'initiale plus vite qu'un
 * long prénom), et l'état sélectionné est signalé par un ring accent +
 * check discret.
 */
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
    <div className="flex flex-wrap gap-3">
      {members.map((member) => {
        const active = selected.includes(member.user_id);
        return (
          <button
            key={member.user_id}
            type="button"
            onClick={() => onToggle(member.user_id)}
            aria-pressed={active}
            className="group/av flex flex-col items-center gap-1.5 outline-none"
          >
            <span
              className={cn(
                "relative flex size-11 items-center justify-center rounded-full text-sm font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground ring-primary ring-offset-background scale-105 ring-2 ring-offset-2"
                  : "bg-muted text-muted-foreground group-hover/av:bg-muted/70 group-focus-visible/av:ring-primary/40 group-focus-visible/av:ring-2",
              )}
            >
              {initials(member.profile?.display_name)}
              {active ? (
                <span className="bg-primary text-primary-foreground ring-background absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full ring-2">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "text-[11px] transition-colors",
                active ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {firstName(member.profile?.display_name)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
