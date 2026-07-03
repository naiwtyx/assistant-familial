"use client";

import { CheckSquare, Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useMyMembership } from "@/features/family/components/family-provider";
import { useFamilyMembers } from "@/features/family/hooks/use-family";
import { isAuthorized } from "@/features/family/lib/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { useAddChore, useChores, useDeleteChore, useSetChoreDone } from "../hooks/use-chores";

const TODAY = new Date().toISOString().slice(0, 10);

function formatDue(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
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
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  function onError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addChore.mutate(
      { title: trimmed, assignedTo: assignedTo || null, dueDate: dueDate || null },
      {
        onError,
        onSuccess: () => {
          setTitle("");
          setAssignedTo("");
          setDueDate("");
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

      <form onSubmit={submit} className="flex flex-col gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nouvelle tâche…"
          maxLength={120}
          aria-label="Intitulé de la tâche"
        />
        <div className="flex gap-2">
          <NativeSelect
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            aria-label="Assigner à"
            className="flex-1"
          >
            <option value="">Pour qui ? (optionnel)</option>
            {members?.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profile?.display_name ?? "Membre"}
              </option>
            ))}
          </NativeSelect>
          <Input
            type="date"
            value={dueDate}
            min={TODAY}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="Échéance"
            className="w-36"
          />
          <Button type="submit" size="icon" disabled={!title.trim()} aria-label="Ajouter la tâche">
            <Plus className="size-4" />
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
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
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                    {chore.assigneeName ? (
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {chore.assigneeName}
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

                {canModerate || chore.created_by === userId ? (
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
    </main>
  );
}
