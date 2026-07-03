"use client";

import {
  BookOpen,
  CalendarClock,
  CheckSquare,
  ChefHat,
  History,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

import { useMyMembership } from "@/features/family/components/family-provider";

import { useActivity } from "../hooks/use-activity";
import type { ActivityWithAuthor } from "../services/activity.service";

function describe(entry: ActivityWithAuthor): { icon: LucideIcon; text: string } {
  const payload = (entry.payload ?? {}) as Record<string, unknown>;
  const str = (key: string) => (typeof payload[key] === "string" ? (payload[key] as string) : "");
  const num = (key: string) => (typeof payload[key] === "number" ? (payload[key] as number) : 0);

  switch (entry.type) {
    case "shopping_add":
      return { icon: ShoppingCart, text: `a ajouté ${str("name")} aux courses` };
    case "chore_done":
      return { icon: CheckSquare, text: `a fait « ${str("title")} » (+${num("points")} pts)` };
    case "meal_cooked":
      return { icon: ChefHat, text: `a cuisiné ${str("recipe") || "un repas"}` };
    case "event_add":
      return { icon: CalendarClock, text: `a ajouté « ${str("title")} » à l'agenda` };
    case "recipe_add":
      return { icon: BookOpen, text: `a créé la recette « ${str("name")} »` };
    default:
      return { icon: History, text: "a fait une action" };
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function ActivityView() {
  const { family } = useMyMembership();
  const { data: entries, isLoading, isError } = useActivity(family.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <History className="text-primary size-5" />
          Activité
        </h1>
        <p className="text-muted-foreground text-sm">Ce que la famille a fait récemment.</p>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;activité.</p>
      ) : entries && entries.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center text-sm">
          Aucune activité pour l&apos;instant.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries?.map((entry) => {
            const { icon: Icon, text } = describe(entry);
            return (
              <li key={entry.id} className="flex items-start gap-3 rounded-xl border p-3">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words">
                    <span className="font-medium">{entry.authorName ?? "Quelqu'un"}</span> {text}
                  </p>
                  <p className="text-muted-foreground text-xs">{timeAgo(entry.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
