import { logActivity } from "@/features/activity/services/activity.service";
import { createClient } from "@/lib/supabase/client";
import type { Chore } from "@/types/db";

export type ChoreRecurrence = "daily" | "weekly";
export type ChoreWithAssignees = Chore & { assigneeNames: string[] };

export type ChoreInput = {
  title: string;
  assigneeIds: string[];
  dueDate: string | null;
  points: number;
  recurrence: ChoreRecurrence | null;
};

/** Tâches de la famille, enrichies des prénoms des personnes assignées. */
export async function getChores(familyId: string): Promise<ChoreWithAssignees[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .eq("family_id", familyId)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const allIds = [...new Set(data.flatMap((chore) => chore.assignee_ids))];
  const byId = new Map<string, string>();
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", allIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((chore) => ({
    ...chore,
    assigneeNames: chore.assignee_ids.map((id) => byId.get(id) ?? "Membre"),
  }));
}

/** Crée une tâche via l'API serveur (qui notifie les personnes assignées). */
export async function addChore(input: ChoreInput): Promise<void> {
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

/** Modifie une tâche (créateur ou parent ; contrôlé côté base). */
export async function updateChore(id: string, input: ChoreInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_chore", {
    p_id: id,
    p_title: input.title.trim(),
    p_assignee_ids: input.assigneeIds,
    p_due_date: input.dueDate,
    p_points: input.points,
    p_recurrence: input.recurrence,
  });
  if (error) throw error;
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
 * Marque une tâche faite/à faire. Si elle est récurrente et vient d'être faite
 * pour la première fois, la prochaine occurrence est créée UNE seule fois
 * (le drapeau `spawned_next` évite les doublons quand on re-coche la tâche).
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

  if (done && chore.recurrence && !chore.spawned_next) {
    const recurrence = chore.recurrence as ChoreRecurrence;
    const { error: insertError } = await supabase.from("chores").insert({
      family_id: chore.family_id,
      title: chore.title,
      assignee_ids: chore.assignee_ids,
      due_date: nextDueDate(chore.due_date, recurrence),
      points: chore.points,
      recurrence,
      created_by: user?.id ?? null,
    });
    if (insertError) throw insertError;

    await supabase.from("chores").update({ spawned_next: true }).eq("id", id);
  }
}

export async function deleteChore(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chores").delete().eq("id", id);
  if (error) throw error;
}
