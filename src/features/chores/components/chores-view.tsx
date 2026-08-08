"use client";

import {
  CheckSquare,
  ChevronDown,
  Pencil,
  Plus,
  Repeat,
  SlidersHorizontal,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateField } from "@/components/ui/date-time-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [title, setTitle] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [points, setPoints] = useState(1);
  const [recurrence, setRecurrence] = useState<"" | ChoreRecurrence>("");
  const [editing, setEditing] = useState<ChoreWithAssignees | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => titleRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

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

  function reset() {
    setTitle("");
    setAssignees([]);
    setDueDate("");
    setPoints(1);
    setRecurrence("");
    setShowDetails(false);
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
          haptic("success");
          reset();
          setIsOpen(false);
        },
      },
    );
  }

  const hasChores = (chores?.length ?? 0) > 0;
  // Sur liste vide, l'EmptyState (avec son bouton) EST l'appel à l'action :
  // on cache la carte repliée "Nouvelle tâche" pour éviter deux boutons
  // d'ajout redondants.
  const showFormCard = isOpen || hasChores;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader title="Tâches" subtitle="Répartissez les corvées de la famille" />

      <PageSuggestion text={suggestion} />

      {/* Classement compact — une seule ligne, très discret. Le podium ne
          doit pas voler la place à la liste des tâches. */}
      {leaderboard.length > 0 ? (
        <div className="motion-in-delay-1 bg-card shadow-soft flex items-center gap-3 rounded-2xl px-4 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Trophy className="size-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
              Classement de la semaine
            </p>
            <p className="mt-0.5 truncate text-[13px]">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <span key={entry.name + index}>
                  {index > 0 ? <span className="text-muted-foreground/50 mx-1.5">·</span> : null}
                  <span className={cn("font-medium", index === 0 && "text-amber-600 dark:text-amber-400")}>
                    {entry.name}
                  </span>
                  <span className="text-muted-foreground ml-1 tabular-nums">
                    {entry.points} pt{entry.points > 1 ? "s" : ""}
                  </span>
                </span>
              ))}
            </p>
          </div>
        </div>
      ) : null}

      {/* Form collapsible — même pattern que l'agenda pour cohérence.
          Masqué quand la liste est vide (l'EmptyState prend le relais). */}
      {showFormCard ? (
      <div
        className={cn(
          "motion-in-delay-2 overflow-hidden rounded-2xl transition-all",
          isOpen ? "bg-card shadow-soft" : "",
        )}
      >
        {isOpen ? (
          <form onSubmit={submit} className="flex flex-col gap-4 p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-heading text-sm font-semibold">Nouvelle tâche</p>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Annuler
              </button>
            </div>

            <div className="grid gap-1.5">
              <Label
                htmlFor="chore-title"
                className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
              >
                Intitulé
              </Label>
              <Input
                id="chore-title"
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nettoyer la cuisine, sortir les poubelles…"
                maxLength={120}
                className="h-11 text-[15px] scroll-mt-24 scroll-mb-32"
              />
            </div>

            {members && members.length > 0 ? (
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Pour · plusieurs possibles
                </Label>
                <AssigneePicker members={members} selected={assignees} onToggle={toggleAssignee} />
              </div>
            ) : null}

            {/* Détails cachés par défaut : garde le form court au-dessus du
                clavier. Déplier à la demande via "Plus d'options". */}
            {showDetails ? (
              <div className="bg-muted/40 flex flex-col gap-3 rounded-xl p-3">
                <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                  Détails
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-muted-foreground text-[11px] font-medium">
                      Échéance · optionnel
                    </Label>
                    <DateField value={dueDate} onChange={setDueDate} min={TODAY} ariaLabel="Échéance" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="chore-points" className="text-muted-foreground text-[11px] font-medium">
                      Points
                    </Label>
                    <NativeSelect
                      id="chore-points"
                      value={points}
                      onChange={(event) => setPoints(Number(event.target.value))}
                      className="h-10"
                    >
                      {POINTS_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value} pt{value > 1 ? "s" : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="chore-rec" className="text-muted-foreground text-[11px] font-medium">
                    Répétition
                  </Label>
                  <NativeSelect
                    id="chore-rec"
                    value={recurrence}
                    onChange={(event) => setRecurrence(event.target.value as "" | ChoreRecurrence)}
                    className="h-10"
                  >
                    <option value="">Ne pas répéter</option>
                    <option value="daily">Chaque jour</option>
                    <option value="weekly">Chaque semaine</option>
                  </NativeSelect>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-muted-foreground hover:text-foreground -mt-1 flex items-center gap-1.5 self-start text-xs transition-colors"
              >
                <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                Plus d&apos;options
              </button>
            )}

            <Button
              type="submit"
              disabled={!title.trim() || addChore.isPending}
              className="h-11 w-full rounded-xl text-[15px] transition-transform active:scale-[0.98]"
            >
              {addChore.isPending ? "Ajout…" : "Ajouter la tâche"}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="bg-card shadow-soft group flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
          >
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Plus className="size-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Nouvelle tâche</p>
              <p className="text-muted-foreground text-xs">
                Assigne, note les points, planifie une récurrence
              </p>
            </div>
            <ChevronDown
              className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-y-0.5"
              strokeWidth={1.75}
            />
          </button>
        )}
      </div>
      ) : null}

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger les tâches.</p>
      ) : !hasChores && !isOpen ? (
        <EmptyState
          icon={CheckSquare}
          title="Aucune tâche"
          description="Répartissez les corvées de la maison. Chaque tâche faite rapporte des points au classement."
          action={
            <Button onClick={() => setIsOpen(true)} className="rounded-xl">
              <Plus className="size-4" strokeWidth={2} />
              Ajouter une tâche
            </Button>
          }
        />
      ) : !hasChores ? null : (
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
