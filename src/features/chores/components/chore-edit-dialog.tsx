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

  function save() {
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

        <div className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Intitulé"
            maxLength={120}
            aria-label="Intitulé de la tâche"
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">Pour qui ?</span>
            <AssigneePicker members={members} selected={assignees} onToggle={toggleAssignee} />
          </div>

          <div className="flex gap-2">
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-label="Échéance"
              className="flex-1"
            />
            <NativeSelect
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
              aria-label="Points"
              className="w-28"
            >
              {POINTS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} pt{value > 1 ? "s" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          <NativeSelect
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value as "" | ChoreRecurrence)}
            aria-label="Répétition"
          >
            <option value="">Ne pas répéter</option>
            <option value="daily">Chaque jour</option>
            <option value="weekly">Chaque semaine</option>
          </NativeSelect>

          <Button onClick={save} disabled={updateChore.isPending || !title.trim()}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
