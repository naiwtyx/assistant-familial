"use client";

import { CheckSquare, Pencil, Plus, Repeat, Trash2, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useMyMembership } from "@/features/family/components/family-provider";
import { useFamilyMembers } from "@/features/family/hooks/use-family";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

import { AssigneePicker } from "./assignee-picker";
import { ChoreEditDialog } from "./chore-edit-dialog";
import {
  useAddChore,
  useChoreLeaderboard,
  useChores,
  useDeleteChore,
  useSetChoreDone,
} from "../hooks/use-chores";
import type { ChoreRecurrence, ChoreWithAssignees } from "../services/chores.service";

const TODAY = new Date().toISOString().slice(0, 10);
const POINTS_OPTIONS = [1, 2, 3, 5, 10];

function formatDue(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
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

  const { data: leaderboard = [] } = useChoreLeaderboard(family.id);

  const overdueCount =
    chores?.filter((chore) => !chore.done && chore.due_date != null && chore.due_date < TODAY)
      .length ?? 0;
  const unassignedCount =
    chores?.filter((chore) => !chore.done && chore.assignee_ids.length === 0).length ?? 0;
  const suggestion = (() => {
    if (overdueCount >= 2) {
      return `${overdueCount} tâches en retard — c'est le moment de rattraper (ou de les réassigner).`;
    }
    if (unassignedCount >= 3) {
      return `${unassignedCount} tâches sans personne assignée — répartis-les pour équilibrer la semaine.`;
    }
    if (leaderboard.length > 0 && leaderboard[0]!.points >= 10) {
      return `${leaderboard[0]!.name} mène le classement avec ${leaderboard[0]!.points} points cette semaine.`;
    }
    return null;
  })();

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Tâches" subtitle="Répartissez les corvées de la famille" />

      <PageSuggestion text={suggestion} />

      {leaderboard.length > 0 ? (
        <div className="motion-in-delay-1 bg-card shadow-soft rounded-2xl p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Trophy className="size-4 text-amber-500" strokeWidth={1.75} />
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

      <form onSubmit={submit} className="motion-in-delay-2 bg-card shadow-soft flex flex-col gap-2.5 rounded-2xl p-3.5">
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
        <EmptyState
          icon={CheckSquare}
          title="Aucune tâche"
          description="Répartissez les corvées de la maison. Chaque tâche faite rapporte des points au classement."
        />
      ) : (
        <ul className="motion-in-delay-3 bg-card shadow-soft flex flex-col rounded-2xl p-2">
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
                  "group/row flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/40",
                  chore.done && "opacity-60",
                )}
              >
                <Checkbox
                  checked={chore.done}
                  disabled={!canToggle}
                  onCheckedChange={(checked) => {
                    haptic(checked === true ? "success" : "light");
                    setDone.mutate(
                      { id: chore.id, done: checked === true },
                      { onError },
                    );
                  }}
                  aria-label="Marquer comme faite"
                  className="mt-1 size-5 transition-transform active:scale-90"
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
                  <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-8"
                      onClick={() => setEditing(chore)}
                      aria-label="Modifier la tâche"
                    >
                      <Pencil className="size-4" strokeWidth={1.75} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8"
                      onClick={() => {
                        haptic("warning");
                        removeChore.mutate(chore.id, { onError });
                      }}
                      aria-label="Supprimer la tâche"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  </div>
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
