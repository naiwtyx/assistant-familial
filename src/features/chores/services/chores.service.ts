import { logActivity } from "@/features/activity/services/activity.service";
import { createClient } from "@/lib/supabase/client";
import type { Chore } from "@/types/db";

export type ChoreRecurrence = "daily" | "weekly";
export type ChoreWithAssignee = Chore & { assigneeName: string | null };

export type AddChoreInput = {
  title: string;
  assignedTo: string | null;
  dueDate: string | null;
  points: number;
  recurrence: ChoreRecurrence | null;
};

/** Tâches de la famille, enrichies du prénom de la personne assignée. */
export async function getChores(familyId: string): Promise<ChoreWithAssignee[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .eq("family_id", familyId)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const assigneeIds = [...new Set(data.map((c) => c.assigned_to).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", assigneeIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((chore) => ({
    ...chore,
    assigneeName: chore.assigned_to ? (byId.get(chore.assigned_to) ?? null) : null,
  }));
}

/** Crée une tâche via l'API serveur (qui notifie la personne assignée). */
export async function addChore(input: AddChoreInput): Promise<void> {
  const response = await fetch("/api/chores/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? "Impossible de créer la tâche.");
  }
}

function nextDueDate(current: string | null, recurrence: ChoreRecurrence): string {
  const base = current ? new Date(`${current}T00:00:00`) : new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + (recurrence === "weekly" ? 7 : 1));
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Marque une tâche faite/à faire. Si elle est récurrente et vient d'être faite,
 * la prochaine occurrence est recréée automatiquement (échéance décalée).
 */
export async function setChoreDone(id: string, done: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: chore, error } = await supabase
    .from("chores")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  if (done) {
    void logActivity(chore.family_id, "chore_done", { title: chore.title, points: chore.points });
  }

  if (done && chore.recurrence === "daily") {
    await createNextOccurrence(chore, "daily", user?.id ?? null);
  } else if (done && chore.recurrence === "weekly") {
    await createNextOccurrence(chore, "weekly", user?.id ?? null);
  }
}

async function createNextOccurrence(
  chore: Chore,
  recurrence: ChoreRecurrence,
  createdBy: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chores").insert({
    family_id: chore.family_id,
    title: chore.title,
    assigned_to: chore.assigned_to,
    due_date: nextDueDate(chore.due_date, recurrence),
    points: chore.points,
    recurrence,
    created_by: createdBy,
  });
  if (error) throw error;
}

export async function deleteChore(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chores").delete().eq("id", id);
  if (error) throw error;
}
