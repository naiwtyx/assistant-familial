"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useFamilyMembers } from "@/features/family/hooks/use-family";
import { getErrorMessage } from "@/lib/get-error-message";

import { AssigneePicker } from "./assignee-picker";
import { useUpdateChore } from "../hooks/use-chores";
import type { ChoreRecurrence, ChoreWithAssignees } from "../services/chores.service";

const POINTS_OPTIONS = [1, 2, 3, 5, 10];

export function ChoreEditDialog({
  familyId,
  chore,
  open,
  onOpenChange,
}: {
  familyId: string;
  chore: ChoreWithAssignees;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: members } = useFamilyMembers(familyId);
  const updateChore = useUpdateChore(familyId);

  const [title, setTitle] = useState(chore.title);
  const [assignees, setAssignees] = useState<string[]>(chore.assignee_ids);
  const [dueDate, setDueDate] = useState(chore.due_date ?? "");
  const [points, setPoints] = useState(chore.points);
  const [recurrence, setRecurrence] = useState<"" | ChoreRecurrence>(
    (chore.recurrence as ChoreRecurrence | null) ?? "",
  );

  function toggleAssignee(userId: string) {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function save(event?: React.FormEvent) {
    event?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    updateChore.mutate(
      {
        id: chore.id,
        input: {
          title: trimmed,
          assigneeIds: assignees,
          dueDate: dueDate || null,
          points,
          recurrence: recurrence || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Tâche modifiée");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>

        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Intitulé
            </Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Intitulé"
              maxLength={120}
              aria-label="Intitulé de la tâche"
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

          <div className="bg-muted/40 flex flex-col gap-3 rounded-xl p-3">
            <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
              Détails
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium">
                  Échéance · optionnel
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-label="Échéance"
                  className="h-10 scroll-mt-24 scroll-mb-32"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium">Points</Label>
                <NativeSelect
                  value={points}
                  onChange={(event) => setPoints(Number(event.target.value))}
                  aria-label="Points"
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
              <Label className="text-muted-foreground text-[11px] font-medium">Répétition</Label>
              <NativeSelect
                value={recurrence}
                onChange={(event) => setRecurrence(event.target.value as "" | ChoreRecurrence)}
                aria-label="Répétition"
                className="h-10"
              >
                <option value="">Ne pas répéter</option>
                <option value="daily">Chaque jour</option>
                <option value="weekly">Chaque semaine</option>
              </NativeSelect>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-popover/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={updateChore.isPending || !title.trim()}
              className="flex-[2]"
            >
              {updateChore.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
