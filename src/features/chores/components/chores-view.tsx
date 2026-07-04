"use client";

import { CheckSquare, Pencil, Plus, Repeat, Trash2, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useMyMembership } from "@/features/family/components/family-provider";
import { useFamilyMembers } from "@/features/family/hooks/use-family";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { AssigneePicker } from "./assignee-picker";
import { ChoreEditDialog } from "./chore-edit-dialog";
import { useAddChore, useChores, useDeleteChore, useSetChoreDone } from "../hooks/use-chores";
import type { ChoreRecurrence, ChoreWithAssignees } from "../services/chores.service";

const TODAY = new Date().toISOString().slice(0, 10);
const POINTS_OPTIONS = [1, 2, 3, 5, 10];

function formatDue(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function startOfWeek(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

/** Classement des points gagnés cette semaine (crédités à chaque destinataire). */
function computeLeaderboard(
  chores: ChoreWithAssignees[] | undefined,
): { name: string; points: number }[] {
  if (!chores) return [];
  const weekStart = startOfWeek().getTime();
  const byAssignee = new Map<string, { name: string; points: number }>();
  for (const chore of chores) {
    if (!chore.done || !chore.done_at) continue;
    if (new Date(chore.done_at).getTime() < weekStart) continue;
    chore.assignee_ids.forEach((id, index) => {
      const entry = byAssignee.get(id) ?? {
        name: chore.assigneeNames[index] ?? "Membre",
        points: 0,
      };
      entry.points += chore.points;
      byAssignee.set(id, entry);
    });
  }
  return [...byAssignee.values()].sort((a, b) => b.points - a.points);
}

export function ChoresView() {
  const { family, role, userId } = useMyMembership();
  const canModerate = isAuthorized(role);

  const { data: chores, isLoading, isError } = useChores(family.id);
  const { data: members } = useFamilyMembers(family.id);
  const addChore = useAddChore(family.id);
  const setDone = useSetChoreDone(family.id);
  const removeChore = useDeleteChore(family.id);

  const [title, setTitle] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [points, setPoints] = useState(1);
  const [recurrence, setRecurrence] = useState<"" | ChoreRecurrence>("");
  const [editing, setEditing] = useState<ChoreWithAssignees | null>(null);

  const leaderboard = computeLeaderboard(chores);

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function toggleAssignee(id: string) {
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addChore.mutate(
      {
        title: trimmed,
        assigneeIds: assignees,
        dueDate: dueDate || null,
        points,
        recurrence: recurrence || null,
      },
      {
        onError,
        onSuccess: () => {
          setTitle("");
          setAssignees([]);
          setDueDate("");
          setPoints(1);
          setRecurrence("");
        },
      },
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <CheckSquare className="text-primary size-5" />
          Tâches
        </h1>
        <p className="text-muted-foreground text-sm">Répartissez les corvées de la famille.</p>
      </header>

      {leaderboard.length > 0 ? (
        <div className="rounded-xl border bg-amber-500/5 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Trophy className="size-4 text-amber-500" />
            Classement de la semaine
          </p>
          <ul className="flex flex-col gap-1">
            {leaderboard.map((entry, index) => (
              <li key={entry.name + index} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4 tabular-nums">{index + 1}.</span>
                  {entry.name}
                </span>
                <span className="font-medium tabular-nums">{entry.points} pts</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border p-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nouvelle tâche…"
          maxLength={120}
          aria-label="Intitulé de la tâche"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Users className="size-3" />
            Pour qui ? (plusieurs possibles)
          </span>
          <AssigneePicker members={members} selected={assignees} onToggle={toggleAssignee} />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dueDate}
            min={TODAY}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Échéance"
            className="flex-1"
          />
          <NativeSelect
            value={points}
            onChange={(event) => setPoints(Number(event.target.value))}
            aria-label="Points"
            className="w-24"
          >
            {POINTS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} pt{value > 1 ? "s" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex gap-2">
          <NativeSelect
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value as "" | ChoreRecurrence)}
            aria-label="Répétition"
            className="flex-1"
          >
            <option value="">Ne pas répéter</option>
            <option value="daily">Chaque jour</option>
            <option value="weekly">Chaque semaine</option>
          </NativeSelect>
          <Button type="submit" size="icon" disabled={!title.trim()} aria-label="Ajouter la tâche">
            <Plus className="size-4" />
          </Button>
        </div>
      </form>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger les tâches.</p>
      ) : chores && chores.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center text-sm">
          Aucune tâche pour l&apos;instant.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {chores?.map((chore) => {
            const overdue = !chore.done && chore.due_date != null && chore.due_date < TODAY;
            const canToggle =
              canModerate ||
              chore.assignee_ids.length === 0 ||
              chore.assignee_ids.includes(userId);
            const canEdit = canModerate || chore.created_by === userId;
            return (
              <li
                key={chore.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-3",
                  chore.done && "opacity-60",
                )}
              >
                <Checkbox
                  checked={chore.done}
                  disabled={!canToggle}
                  onCheckedChange={(checked) =>
                    setDone.mutate({ id: chore.id, done: checked === true }, { onError })
                  }
                  aria-label="Marquer comme faite"
                  className="mt-0.5"
                />

                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm break-words", chore.done && "line-through")}>
                    {chore.title}
                  </p>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    {chore.assigneeNames.length > 0 ? (
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {chore.assigneeNames.join(", ")}
                      </span>
                    ) : null}
                    <span>
                      {chore.points} pt{chore.points > 1 ? "s" : ""}
                    </span>
                    {chore.recurrence ? (
                      <span className="flex items-center gap-1">
                        <Repeat className="size-3" />
                        {chore.recurrence === "weekly" ? "hebdo" : "quotidien"}
                      </span>
                    ) : null}
                    {chore.due_date ? (
                      <span className={cn(overdue && "text-destructive font-medium")}>
                        {overdue ? "En retard · " : "Pour le "}
                        {formatDue(chore.due_date)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                    onClick={() => setEditing(chore)}
                    aria-label="Modifier la tâche"
                  >
                    <Pencil className="size-4" />
                  </Button>
                ) : null}

                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                    onClick={() => removeChore.mutate(chore.id, { onError })}
                    aria-label="Supprimer la tâche"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <ChoreEditDialog
          familyId={family.id}
          chore={editing}
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </main>
  );
}
